const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  Expense, ExpenseApproval, Voucher, VoucherEntry, ChartOfAccount, Project,
} = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'expenses');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

async function generateReference() {
  const count = await Expense.count();
  return `EXP${String(count + 1).padStart(5, '0')}`;
}

async function generateVoucherNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fullPrefix = `EV${yy}${mm}${dd}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${fullPrefix}%` } } });
  return `${fullPrefix}-${String(count + 1).padStart(4, '0')}`;
}

// drAccount/crAccount and project are stored on Expense as plain names
// (matching the dropdowns in ExpensePage.jsx), so resolve them to real
// ChartOfAccount/Project ids before writing ledger entries.
async function resolveAccountId(name) {
  if (!name) return null;
  const acc = await ChartOfAccount.findOne({ where: { name } });
  return acc ? acc.id : null;
}
async function resolveProjectId(name) {
  if (!name) return null;
  const proj = await Project.findOne({ where: { name } });
  return proj ? proj.id : null;
}

// Creates or refreshes the Voucher + 2 VoucherEntry rows backing one
// Expense record, so it posts into the general ledger (Trial Balance,
// Balance Sheet, Income Statement, Day Book). No bankId is set here —
// the Expense form has no Bank field, so these never appear in Bank
// Reconciliation or Cash/Bank Books.
async function syncExpenseVoucher(expense, req) {
  const drAccountId = await resolveAccountId(expense.drAccount);
  const crAccountId = await resolveAccountId(expense.crAccount);
  if (!drAccountId || !crAccountId) {
    throw new Error('Debit/Credit account not found in Chart of Accounts — please re-select from the dropdown');
  }
  const projectId = await resolveProjectId(expense.project);

  let voucher = expense.voucherId ? await Voucher.findByPk(expense.voucherId) : null;
  if (!voucher) {
    voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(),
      type: 'Expense',
      addedBy: req.user?.name || 'Admin',
    });
    expense.voucherId = voucher.id;
  }

  voucher.date = expense.date;
  voucher.projectId = projectId;
  voucher.narration = expense.category || '';
  voucher.reference = expense.reference;
  voucher.amount = Number(expense.amount);
  voucher.attachment = expense.attachment || '';
  await voucher.save();

  await VoucherEntry.destroy({ where: { voucherId: voucher.id } });
  await VoucherEntry.create({ accountId: drAccountId, debit: Number(expense.amount), credit: 0, voucherId: voucher.id });
  await VoucherEntry.create({ accountId: crAccountId, debit: 0, credit: Number(expense.amount), voucherId: voucher.id });

  return voucher;
}

const listInclude = [
  { model: ExpenseApproval },
];

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateReference() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { project, drAccount, crAccount, from, to } = req.query;
    const where = {};
    if (project) where.project = project;
    if (drAccount) where.drAccount = drAccount;
    if (crAccount) where.crAccount = crAccount;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) where.date[Op.lte] = new Date(to);
    }

    const expenses = await Expense.findAll({
      where,
      include: listInclude,
      order: [['createdAt', 'DESC']],
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id, { include: listInclude });
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { project, category, drAccount, crAccount, amount, reference, date } = req.body;

    if (!drAccount || !crAccount || !amount) {
      return res.status(400).json({ message: 'Debit account, Credit account and Amount are required' });
    }

    const expense = await Expense.create({
      project: project || '',
      category: category || '',
      drAccount,
      crAccount,
      amount: Number(amount),
      reference: reference || await generateReference(),
      date: date || Date.now(),
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/expenses/${req.file.filename}` : '',
    });

    try {
      await syncExpenseVoucher(expense, req);
      await expense.save();
    } catch (voucherErr) {
      // Expense itself was saved; surface the ledger-posting failure separately
      // so the user knows the books aren't in sync for this record.
      return res.status(201).json({ ...expense.toJSON(), ledgerWarning: voucherErr.message });
    }

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });

    const fields = ['project', 'category', 'drAccount', 'crAccount', 'amount', 'reference', 'date', 'status'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) expense[key] = req.body[key];
    });
    if (req.file) expense.attachment = `/uploads/expenses/${req.file.filename}`;

    await expense.save();

    try {
      await syncExpenseVoucher(expense, req);
      await expense.save();
    } catch (voucherErr) {
      return res.json({ ...expense.toJSON(), ledgerWarning: voucherErr.message });
    }

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });

    if (expense.voucherId) {
      await Voucher.destroy({ where: { id: expense.voucherId } }); // cascades to its VoucherEntry rows
    }
    await expense.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Expense.findByPk(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });

    const copy = original.toJSON();
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.voucherId;
    copy.reference = await generateReference();
    copy.date = Date.now();
    copy.status = 'pending';

    const created = await Expense.create(copy);
    // Note: approvals are intentionally not duplicated (matches original behavior of resetting to [])

    try {
      await syncExpenseVoucher(created, req);
      await created.save();
    } catch (voucherErr) {
      return res.status(201).json({ ...created.toJSON(), ledgerWarning: voucherErr.message });
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;