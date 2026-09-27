const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PassThrough } = require('stream');
const nodemailer = require('nodemailer');
const { Bill, BillLineItem, BillPayment, BillApproval, ChartOfAccount, Project } = require('../models/associations');
const { buildBillPdf } = require('../utils/billPdf');

function generateCode() {
  return 'Bill' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return { ...it, quantity, rate, amount: quantity * rate };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const aitIncluded = !!body.aitIncluded;
  const aitPercent = Number(body.aitPercent) || 0;
  const aitAmount = aitIncluded ? subtotal * (aitPercent / 100) : 0;

  const interestRate = Number(body.interestRate) || 0;
  const interestAmount = subtotal * (interestRate / 100);

  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;

  const payments = Array.isArray(body.payments) ? body.payments : [];
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const due = grandTotal - paid;

  // Auto-derive status from the payment math, unless the caller explicitly
  // set one (e.g. admin manually marking Cancelled/Overdue via PATCH /status,
  // or passing a status straight through create/update).
  let derivedStatus;
  if (due <= 0 && grandTotal > 0) derivedStatus = 'Paid';
  else if (paid > 0) derivedStatus = 'Partially Paid';
  else derivedStatus = 'Unpaid';

  return {
    subtotal, vatIncluded, vatPercent, vatAmount,
    aitIncluded, aitPercent, aitAmount,
    interestRate, interestAmount, grandTotal, paid, due,
    derivedStatus,
  };
}

// Keeps the linked PurchaseOrder's payment status in sync whenever a Bill
// created from a PO (see purchaseOrder.js -> generateBillFromOrder) is saved.
// A PO is considered Paid once its linked bill's due amount hits zero.
async function syncPurchaseOrderPaymentStatus(bill) {
  const { PurchaseOrder } = require('../models/associations');
  const order = await PurchaseOrder.findOne({ where: { convertedToBillId: bill.id } });
  if (!order) return;

  const isPaid = Number(bill.due) <= 0 && Number(bill.grandTotal) > 0;
  const nextStatus = isPaid ? 'Paid' : 'Unpaid';
  if (order.paymentStatus === nextStatus) return;

  order.paymentStatus = nextStatus;
  order.paidAt = isPaid ? new Date() : null;
  await order.save();

  if (isPaid) {
    const notifyAdmin = require('../utils/notify');
    await notifyAdmin.notifySupplier(
      order.supplierId,
      'PaymentRecorded',
      `Payment recorded for order ${order.code}. Please confirm receipt.`,
      'PurchaseOrder',
      order.id
    );
  }
}

const includeAll = [{ model: BillLineItem }, { model: BillPayment }, { model: BillApproval }];

// ---- File upload (attachments) ----
const uploadDir = path.join(__dirname, '..', 'uploads', 'bills');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `/uploads/bills/${req.file.filename}` });
});

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, customer, project } = req.query;
    const where = {};
    if (customer) where.customerId = customer;
    if (project) where.projectId = project;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await Bill.findAll({
      where,
      include: [
        { model: ChartOfAccount, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        { model: BillLineItem }, { model: BillPayment }, { model: BillApproval },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: ChartOfAccount, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- PDF download ----
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: ChartOfAccount, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${bill.code}.pdf"`);
    buildBillPdf(bill, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Status update ----
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue', 'Cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const bill = await Bill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    bill.status = status;
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Email invoice ----
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Recipient email is required' });

    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: ChartOfAccount, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const pass = new PassThrough();
    const chunks = [];
    pass.on('data', (c) => chunks.push(c));
    const pdfBuffer = await new Promise((resolve, reject) => {
      pass.on('end', () => resolve(Buffer.concat(chunks)));
      pass.on('error', reject);
      buildBillPdf(bill, pass);
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: `Invoice ${bill.code} from TRIKON`,
      text: `Please find attached your invoice ${bill.code}.\n\nGrand Total: ${bill.grandTotal}\nDue: ${bill.due}`,
      attachments: [{ filename: `Invoice-${bill.code}.pdf`, content: pdfBuffer }],
    });

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customer } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);
    const { derivedStatus, ...totalFields } = totals;

    const bill = await Bill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      customerId: req.body.customer,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      refWoNo: req.body.refWoNo,
      contentBody: req.body.contentBody,
      attachment: req.body.attachment,
      status: req.body.status || derivedStatus,
      ...totalFields,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await BillLineItem.create({ ...it, billId: bill.id });
    }
    if (Array.isArray(req.body.payments)) {
      for (const p of req.body.payments) {
        await BillPayment.create({ ...p, billId: bill.id });
      }
    }
    await BillApproval.create({ name: 'Admin', approved: false, billId: bill.id });
    await syncPurchaseOrderPaymentStatus(bill);

    const populated = await Bill.findByPk(bill.id, {
      include: [{ model: ChartOfAccount, attributes: ['name'] }, { model: Project, attributes: ['name'] }, ...includeAll],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const directFields = {
      date: req.body.date,
      customerId: req.body.customer,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      refWoNo: req.body.refWoNo,
      contentBody: req.body.contentBody,
      attachment: req.body.attachment,
      status: req.body.status,
      vatIncluded: req.body.vatIncluded,
      vatPercent: req.body.vatPercent,
      aitIncluded: req.body.aitIncluded,
      aitPercent: req.body.aitPercent,
      interestRate: req.body.interestRate,
    };
    Object.keys(directFields).forEach((key) => {
      if (directFields[key] !== undefined) bill[key] = directFields[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await BillLineItem.destroy({ where: { billId: bill.id } });
      for (const it of items) {
        await BillLineItem.create({ ...it, billId: bill.id });
      }
    } else {
      items = await BillLineItem.findAll({ where: { billId: bill.id } });
    }

    if (req.body.payments !== undefined) {
      await BillPayment.destroy({ where: { billId: bill.id } });
      for (const p of req.body.payments) {
        await BillPayment.create({ ...p, billId: bill.id });
      }
    }

    const totals = computeTotals(req.body, items);
    const { derivedStatus, ...totalFields } = totals;
    Object.assign(bill, totalFields);
    if (req.body.status === undefined) {
      bill.status = derivedStatus;
    }

    await bill.save();
    await syncPurchaseOrderPaymentStatus(bill);
    const populated = await Bill.findByPk(bill.id, {
      include: [{ model: ChartOfAccount, attributes: ['name'] }, { model: Project, attributes: ['name'] }, ...includeAll],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Bill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;