const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const ReceiptVoucher = require('../models/ReceiptVoucher');

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

async function generateVoucherNo() {
  const count = await ReceiptVoucher.countDocuments();
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
    const filter = {};
    if (project) filter.project = project;
    if (creditAccount) filter.creditAccount = creditAccount;
    if (debitAccount) filter.debitAccount = debitAccount;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (site) filter.site = site;
    if (task) filter.task = task;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const vouchers = await ReceiptVoucher.find(filter).sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await ReceiptVoucher.findById(req.params.id);
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
      date, voucherNo, creditAccount, debitAccount, ifCheque, chequeReceiptNo,
      amount, comment, invoiceBill, paymentType, installment,
    } = req.body;

    if (!creditAccount || !debitAccount || !amount) {
      return res.status(400).json({ message: 'Select Accounts, Payment Method and Amount are required' });
    }

    const voucher = await ReceiptVoucher.create({
      projectType: projectType || '',
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
      amount: Number(amount),
      comment: comment || '',
      invoiceBill: invoiceBill || '',
      paymentType: paymentType || '',
      installment: installment || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/receipt-vouchers/${req.file.filename}` : '',
    });

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await ReceiptVoucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'projectType', 'project', 'titleOfWork', 'task', 'site', 'date', 'voucherNo',
      'creditAccount', 'debitAccount', 'chequeReceiptNo', 'amount', 'comment',
      'invoiceBill', 'paymentType', 'installment', 'status',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) voucher[key] = req.body[key];
    });
    if (req.body.ifCheque !== undefined) {
      voucher.ifCheque = req.body.ifCheque === 'true' || req.body.ifCheque === true;
    }
    if (req.file) voucher.attachment = `/uploads/receipt-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    await voucher.save();
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ReceiptVoucher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ReceiptVoucher.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });

    const copy = original.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.voucherNo = await generateVoucherNo();
    copy.date = Date.now();
    copy.status = 'pending';
    copy.approvals = [];
    copy.editedBy = '';

    const created = await ReceiptVoucher.create(copy);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;