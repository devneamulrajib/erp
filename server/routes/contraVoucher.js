const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { ContraVoucher, ContraVoucherLine, ContraVoucherApproval } = require('../models/associations');

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
  const count = await ContraVoucher.count();
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

const includeAll = [{ model: ContraVoucherLine }, { model: ContraVoucherApproval }];

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
    const where = {};
    if (project) where.project = project;
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
      ? [{ model: ContraVoucherLine, where: { [Op.or]: lineWhere } }]
      : [{ model: ContraVoucherLine }];

    const vouchers = await ContraVoucher.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
    });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const voucher = await ContraVoucher.findByPk(req.params.id, { include: includeAll });
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
      totalDebit,
      totalCredit,
      bankAccount: body.bankAccount || null,
      chequeDate: body.chequeDate || null,
      comment: body.comment || '',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/contra-vouchers/${req.file.filename}` : '',
    });

    for (const l of lines) {
      await ContraVoucherLine.create({ ...l, contraVoucherId: voucher.id });
    }

    const populated = await ContraVoucher.findByPk(voucher.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const voucher = await ContraVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Not found' });

    const body = req.body;
    if (body.lines !== undefined) {
      const lines = JSON.parse(body.lines);
      const { totalDebit, totalCredit } = computeTotals(lines);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: `Voucher does not balance: Debit ${totalDebit} vs Credit ${totalCredit}` });
      }
      await ContraVoucherLine.destroy({ where: { contraVoucherId: voucher.id } });
      for (const l of lines) {
        await ContraVoucherLine.create({ ...l, contraVoucherId: voucher.id });
      }
      voucher.totalDebit = totalDebit;
      voucher.totalCredit = totalCredit;
    }

    const plainFields = ['date', 'projectType', 'project', 'titleOfWork', 'site', 'task', 'comment', 'status', 'bankAccount', 'chequeDate'];
    plainFields.forEach((key) => {
      if (body[key] !== undefined) voucher[key] = body[key];
    });
    if (req.file) voucher.attachment = `/uploads/contra-vouchers/${req.file.filename}`;
    voucher.editedBy = req.user?.name || voucher.editedBy;

    await voucher.save();
    const populated = await ContraVoucher.findByPk(voucher.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContraVoucher.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ContraVoucher.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });
    const originalLines = await ContraVoucherLine.findAll({ where: { contraVoucherId: original.id } });

    const copy = original.toJSON();
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.voucherNo = await generateVoucherNo();
    copy.date = Date.now();
    copy.status = 'pending';
    copy.editedBy = '';
    copy.reconciliationStatus = 'Pending';

    const created = await ContraVoucher.create(copy);
    for (const l of originalLines) {
      const lineCopy = l.toJSON();
      delete lineCopy.id;
      delete lineCopy.contraVoucherId;
      await ContraVoucherLine.create({ ...lineCopy, contraVoucherId: created.id });
    }

    const populated = await ContraVoucher.findByPk(created.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;