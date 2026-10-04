// server/routes/officeExpense.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  OfficeExpense, Voucher, VoucherEntry, ChartOfAccount, BudgetCategory, MonthlyBudget,
} = require('../models/associations');
const logActivity = require('../utils/activityLog');

const uploadDir = path.join(__dirname, '..', 'uploads', 'office-expenses');
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
  const count = await OfficeExpense.count();
  return `OEXP${String(count + 1).padStart(5, '0')}`;
}

async function generateVoucherNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fullPrefix = `OE${yy}${mm}${dd}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${fullPrefix}%` } } });
  return `${fullPrefix}-${String(count + 1).padStart(4, '0')}`;
}

async function resolveAccountId(name) {
  if (!name) return null;
  const acc = await ChartOfAccount.findOne({ where: { name } });
  return acc ? acc.id : null;
}

async function syncOfficeExpenseVoucher(officeExpense, req) {
  const drAccountId = await resolveAccountId(officeExpense.drAccount);
  const crAccountId = await resolveAccountId(officeExpense.crAccount);
  if (!drAccountId || !crAccountId) {
    throw new Error('Debit/Credit account not found in Chart of Accounts — please re-select from the dropdown');
  }

  let voucher = officeExpense.voucherId ? await Voucher.findByPk(officeExpense.voucherId) : null;
  if (!voucher) {
    voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(),
      type: 'Office Expense',
      addedBy: req.user?.name || 'Admin',
    });
    officeExpense.voucherId = voucher.id;
  }

  voucher.date = officeExpense.date;
  voucher.narration = officeExpense.title || '';
  voucher.reference = officeExpense.reference;
  voucher.amount = Number(officeExpense.amount);
  voucher.attachment = officeExpense.attachment || '';
  await voucher.save();

  await VoucherEntry.destroy({ where: { voucherId: voucher.id } });
  await VoucherEntry.create({ accountId: drAccountId, debit: Number(officeExpense.amount), credit: 0, voucherId: voucher.id });
  await VoucherEntry.create({ accountId: crAccountId, debit: 0, credit: Number(officeExpense.amount), voucherId: voucher.id });

  return voucher;
}

async function checkBudgetWarning(officeExpense) {
  const category = await BudgetCategory.findByPk(officeExpense.budgetCategoryId);
  if (!category) return null;
  const topCategory = category.parentId ? await BudgetCategory.findByPk(category.parentId) : category;
  if (!topCategory) return null;

  const d = new Date(officeExpense.date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const budget = await MonthlyBudget.findOne({ where: { budgetCategoryId: topCategory.id, year, month } });
  if (!budget) return null;

  const subs = await BudgetCategory.findAll({ where: { parentId: topCategory.id } });
  const categoryIds = [topCategory.id, ...subs.map((s) => s.id)];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const spent = await OfficeExpense.sum('amount', {
    where: { budgetCategoryId: { [Op.in]: categoryIds }, date: { [Op.gte]: startDate, [Op.lt]: endDate } },
  });
  const spentAmount = Number(spent) || 0;
  const allocated = Number(budget.allocatedAmount) || 0;

  if (spentAmount > allocated) {
    return `This puts ${topCategory.name} ৳${(spentAmount - allocated).toLocaleString()} over its ${month}/${year} budget of ৳${allocated.toLocaleString()}.`;
  }
  return null;
}

const listInclude = [{ model: BudgetCategory, as: 'budgetCategory' }];

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateReference() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/report', auth, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const allCategories = await BudgetCategory.findAll({ order: [['name', 'ASC']] });
    const topCategories = allCategories.filter((c) => !c.parentId);
    const subsByParent = {};
    allCategories.forEach((c) => {
      if (c.parentId) (subsByParent[c.parentId] = subsByParent[c.parentId] || []).push(c);
    });

    const budgets = await MonthlyBudget.findAll({ where: { year } });
    const budgetsByCategory = {};
    budgets.forEach((b) => {
      (budgetsByCategory[b.budgetCategoryId] = budgetsByCategory[b.budgetCategoryId] || []).push(b);
    });

    const allExpenses = await OfficeExpense.findAll({
      where: { date: { [Op.gte]: yearStart, [Op.lt]: yearEnd } },
      attributes: ['id', 'amount', 'date', 'status', 'budgetCategoryId'],
    });

    const categoryIdToTop = {};
    allCategories.forEach((c) => { categoryIdToTop[c.id] = c.parentId || c.id; });

    const spentByCategory = {};
    allCategories.forEach((c) => { spentByCategory[c.id] = { yearly: 0, monthly: Array(12).fill(0) }; });

    const monthlyTotals = Array(12).fill(0);
    const statusTotals = {};

    allExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      const m = new Date(exp.date).getMonth();
      if (spentByCategory[exp.budgetCategoryId]) {
        spentByCategory[exp.budgetCategoryId].yearly += amt;
        spentByCategory[exp.budgetCategoryId].monthly[m] += amt;
      }
      monthlyTotals[m] += amt;
      const statusKey = (exp.status || 'pending').toLowerCase();
      statusTotals[statusKey] = (statusTotals[statusKey] || 0) + amt;
    });

    const categories = topCategories.map((cat) => {
      const subs = subsByParent[cat.id] || [];
      const ownSpent = spentByCategory[cat.id] || { yearly: 0, monthly: Array(12).fill(0) };

      const subRows = subs.map((s) => ({
        budgetCategoryId: s.id,
        name: s.name,
        spentAmount: spentByCategory[s.id]?.yearly || 0,
      }));
      const subYearlyTotal = subRows.reduce((sum, s) => sum + s.spentAmount, 0);
      const subMonthly = Array(12).fill(0);
      subs.forEach((s) => {
        (spentByCategory[s.id]?.monthly || []).forEach((v, i) => { subMonthly[i] += v; });
      });

      const yearBudgetRows = budgetsByCategory[cat.id] || [];
      const allocatedYearly = yearBudgetRows.reduce((sum, b) => sum + (Number(b.allocatedAmount) || 0), 0);
      const monthsSet = allocatedYearly > 0
        ? Array(12).fill(0).map((_, i) => {
          const b = yearBudgetRows.find((r) => r.month === i + 1);
          return b ? Number(b.allocatedAmount) || 0 : 0;
        })
        : Array(12).fill(0);

      const spentYearly = ownSpent.yearly + subYearlyTotal;
      const monthlySpent = ownSpent.monthly.map((v, i) => v + subMonthly[i]);

      return {
        budgetCategoryId: cat.id,
        name: cat.name,
        allocatedAmount: allocatedYearly,
        allocatedByMonth: monthsSet,
        spentAmount: spentYearly,
        spentByMonth: monthlySpent,
        remainingAmount: allocatedYearly - spentYearly,
        subcategories: subRows,
      };
    });

    const totals = categories.reduce((acc, r) => ({
      allocatedAmount: acc.allocatedAmount + r.allocatedAmount,
      spentAmount: acc.spentAmount + r.spentAmount,
      remainingAmount: acc.remainingAmount + r.remainingAmount,
    }), { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 });

    const topSpenders = [...categories].sort((a, b) => b.spentAmount - a.spentAmount).slice(0, 5);

    res.json({
      year,
      totals,
      monthlyTrend: monthlyTotals,
      statusTotals,
      categories,
      topSpenders,
      entryCount: allExpenses.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { budgetCategory, from, to } = req.query;
    const where = {};
    if (budgetCategory) where.budgetCategoryId = budgetCategory;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) where.date[Op.lte] = new Date(to);
    }
    const rows = await OfficeExpense.findAll({ where, include: listInclude, order: [['createdAt', 'DESC']] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const row = await OfficeExpense.findByPk(req.params.id, { include: listInclude });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { title, budgetCategory, drAccount, crAccount, amount, reference, date } = req.body;

    if (!budgetCategory) {
      return res.status(400).json({ message: 'Office Budget Category is required' });
    }
    if (!drAccount || !crAccount || !amount) {
      return res.status(400).json({ message: 'Debit account, Credit account and Amount are required' });
    }

    const officeExpense = await OfficeExpense.create({
      title: title || '',
      budgetCategoryId: budgetCategory,
      drAccount,
      crAccount,
      amount: Number(amount),
      reference: reference || await generateReference(),
      date: date || Date.now(),
      status: 'pending',
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/office-expenses/${req.file.filename}` : '',
    });

    let budgetWarning = null;
    try {
      budgetWarning = await checkBudgetWarning(officeExpense);
    } catch { /* non-critical */ }

    try {
      await syncOfficeExpenseVoucher(officeExpense, req);
      await officeExpense.save();
    } catch (voucherErr) {
      return res.status(201).json({ ...officeExpense.toJSON(), ledgerWarning: voucherErr.message, budgetWarning });
    }

    await logActivity({
      module: 'Expense', action: 'Created',
      message: `Added expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference})`,
      amount: officeExpense.amount, budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense', relatedId: officeExpense.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.status(201).json({ ...officeExpense.toJSON(), budgetWarning });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update status (Approve / Reject / Pending)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = String(status || '').toLowerCase();
    if (!['approved', 'pending', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Status must be approved, pending, or rejected' });
    }

    const officeExpense = await OfficeExpense.findByPk(req.params.id, { include: listInclude });
    if (!officeExpense) return res.status(404).json({ message: 'Expense record not found' });

    const previousStatus = officeExpense.status;
    officeExpense.status = normalizedStatus;
    await officeExpense.save();

    await logActivity({
      module: 'Expense',
      action: normalizedStatus === 'approved' ? 'Approved' : normalizedStatus === 'rejected' ? 'Rejected' : 'Updated',
      message: `${normalizedStatus.toUpperCase()} expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference})`,
      amount: officeExpense.amount,
      budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense',
      relatedId: officeExpense.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.json(officeExpense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const officeExpense = await OfficeExpense.findByPk(req.params.id);
    if (!officeExpense) return res.status(404).json({ message: 'Not found' });

    const previousAmount = Number(officeExpense.amount);

    const fields = ['title', 'drAccount', 'crAccount', 'amount', 'reference', 'date', 'status'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) officeExpense[key] = req.body[key];
    });
    if (req.body.budgetCategory !== undefined) {
      if (!req.body.budgetCategory) {
        return res.status(400).json({ message: 'Office Budget Category is required' });
      }
      officeExpense.budgetCategoryId = req.body.budgetCategory;
    }
    if (req.file) officeExpense.attachment = `/uploads/office-expenses/${req.file.filename}`;

    await officeExpense.save();

    let budgetWarning = null;
    try {
      budgetWarning = await checkBudgetWarning(officeExpense);
    } catch { /* non-critical */ }

    try {
      await syncOfficeExpenseVoucher(officeExpense, req);
      await officeExpense.save();
    } catch (voucherErr) {
      return res.json({ ...officeExpense.toJSON(), ledgerWarning: voucherErr.message, budgetWarning });
    }

    await logActivity({
      module: 'Expense', action: 'Updated',
      message: `Updated expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference}) — ৳${previousAmount.toLocaleString()} → ৳${Number(officeExpense.amount).toLocaleString()}`,
      amount: officeExpense.amount, budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense', relatedId: officeExpense.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.json({ ...officeExpense.toJSON(), budgetWarning });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const officeExpense = await OfficeExpense.findByPk(req.params.id);
    if (!officeExpense) return res.status(404).json({ message: 'Not found' });

    if (officeExpense.voucherId) {
      await Voucher.destroy({ where: { id: officeExpense.voucherId } });
    }

    await logActivity({
      module: 'Expense', action: 'Deleted',
      message: `Deleted expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference})`,
      amount: officeExpense.amount, budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense', relatedId: officeExpense.id,
      performedBy: req.user?.name || 'Admin',
    });

    await officeExpense.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;