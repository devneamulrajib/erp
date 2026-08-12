const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const ContraVoucher = require('../models/ContraVoucher');

const uploadDir = path.join(__dirname, '..', 'uploads', 'contra-vouchers');
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
  const count = await ContraVoucher.countDocuments();
  return `C${String(100 + count + 1)}`;
}

function computeTotals(lines) {
  return lines.reduce(
    (acc, l) => ({
      totalDebit: acc.totalDebit + Number(l.debit || 0),
      totalCredit: acc.totalCredit + Number(l.credit || 0),
    }),
    { totalDebit: 0, totalCredit: 0 },
  );
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
    const { project, debitAccount, creditAccount, site, task, from, to } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (site) filter.site = site;
    if (task) filter.task = task;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (debitAccount) filter['lines'] = { $elemMatch: { account: debitAccount, debit: { $gt: 0 } } };
    if (creditAccount) filter['lines'] = { ...(filter['lines'] || {}), $elemMatch: { account: creditAccount, credit: { $gt: 0 } } };

    const vouchers = await ContraVoucher.find(filter).sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await ContraVoucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const body = req.body;
    const lines = JSON.parse(body.lines || '[]');
    if (lines.length < 2) {
      return res.status(400).json({ message: 'At least two account lines are required' });
    }

    const { totalDebit, totalCredit } = computeTotals(lines);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: `Voucher does not balance: Debit ${totalDebit} vs Credit ${totalCredit}` });
    }

    const voucher = await ContraVoucher.create({
      voucherNo: body.voucherNo || await generateVoucherNo(),
      date: body.date || Date.now(),
      projectType: body.projectType || '',
      project: body.project || '',
      titleOfWork: body.titleOfWork || '',
      site: body.site || '',
      task: body.task || '',
      lines,
      totalDebit,
      totalCredit,
      comment: body.comment || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/contra-vouchers/${req.file.filename}` : '',
    });

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await ContraVoucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    const body = req.body;
    if (body.lines !== undefined) {
      const lines = JSON.parse(body.lines);
      const { totalDebit, totalCredit } = computeTotals(lines);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: `Voucher does not balance: Debit ${totalDebit} vs Credit ${totalCredit}` });
      }
      voucher.lines = lines;
      voucher.totalDebit = totalDebit;
      voucher.totalCredit = totalCredit;
    }

    const plainFields = ['date', 'projectType', 'project', 'titleOfWork', 'site', 'task', 'comment', 'status'];
    plainFields.forEach((key) => {
      if (body[key] !== undefined) voucher[key] = body[key];
    });
    if (req.file) voucher.attachment = `/uploads/contra-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    await voucher.save();
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContraVoucher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ContraVoucher.findById(req.params.id);
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

    const created = await ContraVoucher.create(copy);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;