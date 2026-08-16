const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { JournalVoucher, JournalVoucherLine, JournalVoucherApproval } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'journal-vouchers');
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
  const count = await JournalVoucher.count();
  return `J${String(100 + count + 1)}`;
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

const includeAll = [{ model: JournalVoucherLine }, { model: JournalVoucherApproval }];

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
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (site) where.site = site;
    if (task) where.task = task;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) where.date[Op.lte] = new Date(to);
    }

    const lineWhere = [];
    if (debitAccount) lineWhere.push({ account: debitAccount, debit: { [Op.gt]: 0 } });
    if (creditAccount) lineWhere.push({ account: creditAccount, credit: { [Op.gt]: 0 } });

    const include = lineWhere.length
      ? [{ model: JournalVoucherLine, where: { [Op.or]: lineWhere } }]
      : [{ model: JournalVoucherLine }];

    const vouchers = await JournalVoucher.findAll({ where, include, order: [['createdAt', 'DESC']] });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await JournalVoucher.findByPk(req.params.id, { include: includeAll });
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

    const voucher = await JournalVoucher.create({
      voucherNo: body.voucherNo || await generateVoucherNo(),
      date: body.date || Date.now(),
      projectType: body.projectType || '',
      project: body.project || '',
      titleOfWork: body.titleOfWork || '',
      site: body.site || '',
      task: body.task || '',
      totalDebit,
      totalCredit,
      comment: body.comment || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/journal-vouchers/${req.file.filename}` : '',
    });

    for (const l of lines) {
      await JournalVoucherLine.create({ ...l, journalVoucherId: voucher.id });
    }

    const populated = await JournalVoucher.findByPk(voucher.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await JournalVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    const body = req.body;
    if (body.lines !== undefined) {
      const lines = JSON.parse(body.lines);
      const { totalDebit, totalCredit } = computeTotals(lines);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: `Voucher does not balance: Debit ${totalDebit} vs Credit ${totalCredit}` });
      }
      await JournalVoucherLine.destroy({ where: { journalVoucherId: voucher.id } });
      for (const l of lines) {
        await JournalVoucherLine.create({ ...l, journalVoucherId: voucher.id });
      }
      voucher.totalDebit = totalDebit;
      voucher.totalCredit = totalCredit;
    }

    const plainFields = ['date', 'projectType', 'project', 'titleOfWork', 'site', 'task', 'comment', 'status'];
    plainFields.forEach((key) => {
      if (body[key] !== undefined) voucher[key] = body[key];
    });
    if (req.file) voucher.attachment = `/uploads/journal-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    await voucher.save();
    const populated = await JournalVoucher.findByPk(voucher.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await JournalVoucher.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await JournalVoucher.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });
    const originalLines = await JournalVoucherLine.findAll({ where: { journalVoucherId: original.id } });

    const copy = original.toJSON();
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.voucherNo = await generateVoucherNo();
    copy.date = Date.now();
    copy.status = 'pending';
    copy.editedBy = '';

    const created = await JournalVoucher.create(copy);
    for (const l of originalLines) {
      const lineCopy = l.toJSON();
      delete lineCopy.id;
      delete lineCopy.journalVoucherId;
      await JournalVoucherLine.create({ ...lineCopy, journalVoucherId: created.id });
    }

    const populated = await JournalVoucher.findByPk(created.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;