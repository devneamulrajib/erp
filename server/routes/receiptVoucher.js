const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { ReceiptVoucher, ReceiptVoucherApproval } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'receipt-vouchers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const isAdminUser = (user) => ['superadmin', 'admin'].includes(user?.role);

async function generateVoucherNo() {
  const count = await ReceiptVoucher.count();
  return `R${String(count + 1).padStart(5, '0')}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateVoucherNo() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { project, creditAccount, debitAccount, titleOfWork, site, task, from, to } = req.query;
    const where = {};
    if (project) where.project = project;
    if (creditAccount) where.creditAccount = creditAccount;
    if (debitAccount) where.debitAccount = debitAccount;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (site) where.site = site;
    if (task) where.task = task;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) where.date[Op.lte] = new Date(to);
    }

    const vouchers = await ReceiptVoucher.findAll({
      where,
      include: [{ model: ReceiptVoucherApproval, as: 'approvals' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await ReceiptVoucher.findByPk(req.params.id, {
      include: [{ model: ReceiptVoucherApproval, as: 'approvals' }],
    });
    if (!voucher) return res.status(404).json({ message: 'Not found' });
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const {
      project, titleOfWork, task, site,
      date, voucherNo, creditAccount, debitAccount, ifCheque, chequeReceiptNo,
      amount, comment, invoiceBill, paymentType, installment, bankAccount, chequeDate,
    } = req.body;

    if (!creditAccount || !debitAccount || !amount) {
      return res.status(400).json({ message: 'Select Accounts, Payment Method and Amount are required' });
    }

    const voucher = await ReceiptVoucher.create({
      project: project || '',
      titleOfWork: titleOfWork || '',
      task: task || '',
      site: site || '',
      date: date || Date.now(),
      voucherNo: voucherNo || await generateVoucherNo(),
      creditAccount,
      debitAccount,
      ifCheque: ifCheque === 'true' || ifCheque === true,
      chequeReceiptNo: chequeReceiptNo || '',
      bankAccount: bankAccount || null,
      chequeDate: chequeDate || null,
      amount: Number(amount),
      comment: comment || '',
      invoiceBill: invoiceBill || '',
      paymentType: paymentType || '',
      installment: installment || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/receipt-vouchers/${req.file.filename}` : '',
      // New vouchers always start pending; only the Approval Center (admin) can approve.
      status: 'pending',
    });

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await ReceiptVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    // RESTRICTION: Non-admin cannot edit approved vouchers
    const isNonAdmin = !isAdminUser(req.user);
    if (isNonAdmin && String(voucher.status).toLowerCase() === 'approved') {
      return res.status(403).json({ message: 'Approved receipt vouchers cannot be edited by an Accountant. Contact Admin.' });
    }

    const fields = [
      'project', 'titleOfWork', 'task', 'site', 'date', 'voucherNo',
      'creditAccount', 'debitAccount', 'chequeReceiptNo', 'amount', 'comment',
      'invoiceBill', 'paymentType', 'installment', 'bankAccount', 'chequeDate',
    ];
    if (!isNonAdmin) fields.push('status'); // Only Admin can change status directly

    fields.forEach((key) => {
      if (req.body[key] !== undefined) voucher[key] = req.body[key];
    });
    if (req.body.ifCheque !== undefined) {
      voucher.ifCheque = req.body.ifCheque === 'true' || req.body.ifCheque === true;
    }
    if (req.file) voucher.attachment = `/uploads/receipt-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    // If an Accountant edits a rejected voucher, send it back for approval
    if (isNonAdmin && String(voucher.status).toLowerCase() === 'rejected') {
      voucher.status = 'pending';
    }

    await voucher.save();
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const voucher = await ReceiptVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    // RESTRICTION: Non-admin cannot delete approved vouchers
    const isNonAdmin = !isAdminUser(req.user);
    if (isNonAdmin && String(voucher.status).toLowerCase() === 'approved') {
      return res.status(403).json({ message: 'Approved receipt vouchers cannot be deleted by an Accountant. Contact Admin.' });
    }

    await voucher.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ReceiptVoucher.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });

    const copy = original.toJSON();
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.voucherNo = await generateVoucherNo();
    copy.date = Date.now();
    copy.status = 'pending';
    copy.editedBy = '';
    copy.reconciliationStatus = 'Pending';

    const created = await ReceiptVoucher.create(copy);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;