const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { PaymentVoucher, PaymentVoucherApproval } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'payment-vouchers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

async function generateVoucherNo() {
  const count = await PaymentVoucher.count();
  return `P${String(900000 + count + 1)}`;
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
    const { project, debitAccount, creditAccount, titleOfWork, site, task, from, to } = req.query;
    const where = {};
    if (project) where.project = project;
    if (debitAccount) where.debitAccount = debitAccount;
    if (creditAccount) where.creditAccount = creditAccount;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (site) where.site = site;
    if (task) where.task = task;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) where.date[Op.lte] = new Date(to);
    }

    const vouchers = await PaymentVoucher.findAll({
      where,
      include: [{ model: PaymentVoucherApproval, as: 'approvals' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await PaymentVoucher.findByPk(req.params.id, {
      include: [{ model: PaymentVoucherApproval, as: 'approvals' }],
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
      projectType, project, titleOfWork, task, site,
      date, voucherNo, debitAccount, creditAccount, ifCheque, chequeReceiptNo,
      amount, comment, invoiceBill, item, bankAccount, chequeDate,
    } = req.body;

    if (!debitAccount || !creditAccount || !amount) {
      return res.status(400).json({ message: 'Select Accounts, Payment Method and Amount are required' });
    }

    const voucher = await PaymentVoucher.create({
      projectType: projectType || '',
      project: project || '',
      titleOfWork: titleOfWork || '',
      task: task || '',
      site: site || '',
      date: date || Date.now(),
      voucherNo: voucherNo || await generateVoucherNo(),
      debitAccount,
      creditAccount,
      ifCheque: ifCheque === 'true' || ifCheque === true,
      chequeReceiptNo: chequeReceiptNo || '',
      bankAccount: bankAccount || null,
      chequeDate: chequeDate || null,
      amount: Number(amount),
      comment: comment || '',
      invoiceBill: invoiceBill || '',
      item: item || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/payment-vouchers/${req.file.filename}` : '',
    });

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await PaymentVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'projectType', 'project', 'titleOfWork', 'task', 'site', 'date', 'voucherNo',
      'debitAccount', 'creditAccount', 'chequeReceiptNo', 'amount', 'comment',
      'invoiceBill', 'item', 'status', 'bankAccount', 'chequeDate',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) voucher[key] = req.body[key];
    });
    if (req.body.ifCheque !== undefined) {
      voucher.ifCheque = req.body.ifCheque === 'true' || req.body.ifCheque === true;
    }
    if (req.file) voucher.attachment = `/uploads/payment-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    await voucher.save();
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await PaymentVoucher.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await PaymentVoucher.findByPk(req.params.id);
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

    const created = await PaymentVoucher.create(copy);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;