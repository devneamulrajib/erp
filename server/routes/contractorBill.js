const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  ContractorBill, ContractorBillItem, ContractorBillPayment, ContractorBillApproval,
  Party, ChartOfAccount, Project,
} = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'contractor-bills');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

function generateCode() {
  return 'P.Bill' + Math.floor(1000000 + Math.random() * 9000000);
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
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const securityDeposit = Number(body.securityDeposit) || 0;
  const grandTotal = subtotal + vatAmount + securityDeposit;

  const payments = Array.isArray(body.payments) ? body.payments : [];
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const due = grandTotal - paid;

  return { subtotal, totalQuantity, vatIncluded, vatPercent, vatAmount, securityDeposit, grandTotal, paid, due };
}

const includeAll = [{ model: ContractorBillItem }, { model: ContractorBillPayment }, { model: ContractorBillApproval }];
const includeFull = [
  { model: Party, attributes: ['name'] },
  { model: ChartOfAccount, attributes: ['name', 'code'] },
  { model: Project, attributes: ['name'] },
  ...includeAll,
];

function formatDate(d) {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatAmount(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const INDIGO = '#4f46e5';
const SLATE = '#334155';
const MUTED = '#94a3b8';
const LINE = '#e2e8f0';

function sectionTitle(doc, text, pageWidth, marginLeft) {
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor(MUTED).font('Helvetica-Bold').text(text.toUpperCase(), { characterSpacing: 0.5 });
  const y = doc.y + 3;
  doc.moveTo(marginLeft, y).lineTo(marginLeft + pageWidth, y).strokeColor(LINE).lineWidth(1).stroke();
  doc.y = y + 10;
}

function generateContractorBillPdf(bill, res) {
  const items = bill.ContractorBillItems || [];
  const payments = bill.ContractorBillPayments || [];

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const safeName = (bill.code || `bill-${bill.id}`).replace(/[^a-z0-9-_]+/gi, '_');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  doc.pipe(res);

  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  doc.fontSize(20).fillColor(INDIGO).font('Helvetica-Bold').text('TRIKON', marginLeft, 50);
  doc.fontSize(9).fillColor(MUTED).font('Helvetica').text('BUSINESS MANAGEMENT', marginLeft, 72, { characterSpacing: 1 });

  const metaX = marginLeft + pageWidth - 220;
  doc.fontSize(9).fillColor(SLATE).font('Helvetica');
  doc.text(`Bill Code: ${bill.code || 'N/A'}`, metaX, 50, { width: 220, align: 'right' });
  doc.text(`Date: ${formatDate(bill.date)}`, metaX, 64, { width: 220, align: 'right' });
  doc.text(`Contractor/Supplier: ${bill.Party?.name || 'N/A'}`, metaX, 78, { width: 220, align: 'right' });

  doc.moveTo(marginLeft, 100).lineTo(marginLeft + pageWidth, 100).strokeColor(INDIGO).lineWidth(2).stroke();
  doc.y = 118;

  doc.fontSize(15).fillColor('#0f172a').font('Helvetica-Bold')
    .text(bill.titleOfWork || 'Contractor / Supplier Bill', marginLeft, doc.y, { width: pageWidth, align: 'center' });
  doc.moveDown(0.6);

  // Reference info
  sectionTitle(doc, 'Bill Reference', pageWidth, marginLeft);
  const refRows = [
    ['Project', bill.Project?.name || '—', 'Ledger', bill.ChartOfAccount?.name || '—'],
    ['Project Type', bill.projectType || '—', 'Ref W/O No.', bill.refWoNo || '—'],
  ];
  doc.fontSize(9).font('Helvetica');
  const half = pageWidth / 2;
  refRows.forEach((r) => {
    const y = doc.y;
    doc.fillColor(MUTED).text(r[0], marginLeft, y, { width: 90 });
    doc.fillColor(SLATE).text(r[1], marginLeft + 95, y, { width: half - 95 });
    doc.fillColor(MUTED).text(r[2], marginLeft + half, y, { width: 90 });
    doc.fillColor(SLATE).text(r[3], marginLeft + half + 95, y, { width: half - 95 });
    doc.y = y + 16;
  });

  // Items
  if (items.length) {
    sectionTitle(doc, 'Bill Items', pageWidth, marginLeft);
    let ty = doc.y;
    doc.fontSize(9).fillColor(MUTED).font('Helvetica-Bold');
    doc.text('ITEM', marginLeft, ty, { width: pageWidth * 0.3 });
    doc.text('QTY', marginLeft + pageWidth * 0.55, ty, { width: pageWidth * 0.13, align: 'right' });
    doc.text('RATE', marginLeft + pageWidth * 0.68, ty, { width: pageWidth * 0.15, align: 'right' });
    doc.text('AMOUNT', marginLeft, ty, { width: pageWidth, align: 'right' });
    ty += 14;
    doc.moveTo(marginLeft, ty).lineTo(marginLeft + pageWidth, ty).strokeColor(LINE).stroke();
    ty += 8;

    doc.font('Helvetica').fillColor(SLATE);
    items.forEach((it) => {
      if (ty > doc.page.height - 100) { doc.addPage(); ty = doc.page.margins.top; }
      doc.text(it.itemName || '—', marginLeft, ty, { width: pageWidth * 0.5 });
      doc.text(String(it.quantity ?? 0), marginLeft + pageWidth * 0.55, ty, { width: pageWidth * 0.13, align: 'right' });
      doc.text(formatAmount(it.rate), marginLeft + pageWidth * 0.68, ty, { width: pageWidth * 0.15, align: 'right' });
      doc.text(formatAmount(it.amount), marginLeft, ty, { width: pageWidth, align: 'right' });
      ty += 16;
      doc.moveTo(marginLeft, ty - 4).lineTo(marginLeft + pageWidth, ty - 4).strokeColor('#f1f5f9').stroke();
    });
    doc.y = ty + 10;
  }

  // Payments
  if (payments.length) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    sectionTitle(doc, 'Payments', pageWidth, marginLeft);
    let py = doc.y;
    doc.fontSize(9).fillColor(MUTED).font('Helvetica-Bold');
    doc.text('DATE', marginLeft, py, { width: pageWidth * 0.25 });
    doc.text('METHOD', marginLeft + pageWidth * 0.25, py, { width: pageWidth * 0.35 });
    doc.text('AMOUNT', marginLeft, py, { width: pageWidth, align: 'right' });
    py += 14;
    doc.moveTo(marginLeft, py).lineTo(marginLeft + pageWidth, py).strokeColor(LINE).stroke();
    py += 8;

    doc.font('Helvetica').fillColor(SLATE);
    payments.forEach((p) => {
      if (py > doc.page.height - 100) { doc.addPage(); py = doc.page.margins.top; }
      doc.text(p.date || '—', marginLeft, py, { width: pageWidth * 0.25 });
      doc.text(p.paymentMethod || '—', marginLeft + pageWidth * 0.25, py, { width: pageWidth * 0.35 });
      doc.text(formatAmount(p.amount), marginLeft, py, { width: pageWidth, align: 'right' });
      py += 16;
    });
    doc.y = py + 10;
  }

  // Totals
  if (doc.y > doc.page.height - 160) doc.addPage();
  sectionTitle(doc, 'Totals', pageWidth, marginLeft);
  const totalRows = [
    ['Subtotal', formatAmount(bill.subtotal)],
    [`VAT (${bill.vatPercent || 0}%)`, formatAmount(bill.vatAmount)],
    ['Security Deposit', formatAmount(bill.securityDeposit)],
  ];
  doc.fontSize(10).font('Helvetica');
  totalRows.forEach(([label, val]) => {
    const y = doc.y;
    doc.fillColor(MUTED).text(label, marginLeft, y, { width: pageWidth - 120 });
    doc.fillColor(SLATE).text(val, marginLeft, y, { width: pageWidth, align: 'right' });
    doc.y = y + 16;
  });
  doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(INDIGO).lineWidth(2).stroke();
  doc.y += 8;
  doc.font('Helvetica-Bold').fillColor(INDIGO);
  const gy = doc.y;
  doc.text('Grand Total', marginLeft, gy, { width: pageWidth - 120 });
  doc.text(formatAmount(bill.grandTotal), marginLeft, gy, { width: pageWidth, align: 'right' });
  doc.y = gy + 20;

  doc.font('Helvetica').fillColor('#059669');
  const py2 = doc.y;
  doc.text('Paid', marginLeft, py2, { width: pageWidth - 120 });
  doc.text(formatAmount(bill.paid), marginLeft, py2, { width: pageWidth, align: 'right' });
  doc.y = py2 + 16;

  doc.fillColor('#dc2626');
  const dy = doc.y;
  doc.text('Due', marginLeft, dy, { width: pageWidth - 120 });
  doc.text(formatAmount(bill.due), marginLeft, dy, { width: pageWidth, align: 'right' });

  doc.end();
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, party, ledger, project, titleOfWork } = req.query;
    const where = {};
    if (party) where.partyId = party;
    if (ledger) where.ledgerId = ledger;
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await ContractorBill.findAll({
      where,
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, attributes: ['name', 'code'] },
        { model: Project, attributes: ['name'] },
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
    const bill = await ContractorBill.findByPk(req.params.id, { include: includeFull });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const bill = await ContractorBill.findByPk(req.params.id, { include: includeFull });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    generateContractorBillPdf(bill.toJSON(), res);
  } catch (err) {
    console.error('Contractor bill PDF generation failed:', err);
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { party } = req.body;
    if (!party) return res.status(400).json({ message: 'Contractor/Supplier is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const bill = await ContractorBill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      partyId: req.body.party,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      titleOfWork: req.body.titleOfWork,
      task: req.body.task,
      siteId: req.body.site,
      categoryId: req.body.category,
      refWoNo: req.body.refWoNo,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await ContractorBillItem.create({ ...it, itemId: it.item, contractorBillId: bill.id });
    }
    if (Array.isArray(req.body.payments)) {
      for (const p of req.body.payments) {
        await ContractorBillPayment.create({ ...p, contractorBillId: bill.id });
      }
    }
    await ContractorBillApproval.create({ name: 'Admin', approved: false, contractorBillId: bill.id });

    const populated = await ContractorBill.findByPk(bill.id, { include: includeFull });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await ContractorBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const directFields = {
      date: req.body.date,
      partyId: req.body.party,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      titleOfWork: req.body.titleOfWork,
      task: req.body.task,
      siteId: req.body.site,
      categoryId: req.body.category,
      refWoNo: req.body.refWoNo,
      vatIncluded: req.body.vatIncluded,
      vatPercent: req.body.vatPercent,
      securityDeposit: req.body.securityDeposit,
    };
    Object.keys(directFields).forEach((key) => {
      if (directFields[key] !== undefined) bill[key] = directFields[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await ContractorBillItem.destroy({ where: { contractorBillId: bill.id } });
      for (const it of items) {
        await ContractorBillItem.create({ ...it, itemId: it.item, contractorBillId: bill.id });
      }
    } else {
      items = await ContractorBillItem.findAll({ where: { contractorBillId: bill.id } });
    }

    if (req.body.payments !== undefined) {
      await ContractorBillPayment.destroy({ where: { contractorBillId: bill.id } });
      for (const p of req.body.payments) {
        await ContractorBillPayment.create({ ...p, contractorBillId: bill.id });
      }
    }

    const totals = computeTotals(req.body, items);
    Object.assign(bill, totals);

    await bill.save();
    const populated = await ContractorBill.findByPk(bill.id, { include: includeFull });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/attachment', auth, (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err) {
      console.error('Attachment upload failed:', err);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const bill = await ContractorBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    if (req.file) {
      bill.attachment = `/uploads/contractor-bills/${req.file.filename}`;
      await bill.save();
    }
    res.json({ attachment: bill.attachment });
  } catch (err) {
    console.error('Saving attachment failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContractorBill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;