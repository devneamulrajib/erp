// server/routes/officeExpense.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const sequelize = require('../config/db');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  OfficeExpense,
  BudgetCategory,
  MonthlyBudget,
} = require('../models/associations');
const MonthlyBudgetCashReceipt = require('../models/MonthlyBudgetCashReceipt');
const logActivity = require('../utils/activityLog');
const { notifyAdmin, notifyAccountant } = require('../utils/notify');
const {
  cleanText,
  cleanMethod,
  fail,
  applyAccountDefaults,
  resolveAccountIds,
  unpostExpense,
  syncLedger,
} = require('../utils/officeExpensePosting');

// Ledger rule:
//   approved  -> journal entry is on the ledger
//   pending / rejected -> nothing on the ledger
// When true, an expense saved by an admin is approved (and therefore posted)
// immediately. Set to false to make admins' entries wait for approval too.
const AUTO_APPROVE_ADMIN = true;
const isAdminRole = (user) => ['superadmin', 'admin'].includes(user?.role);

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

// Activity log / notifications must never fail or block a save.
async function safely(fn) {
  try {
    await fn();
  } catch (err) {
    console.error('OfficeExpense side-effect error:', err.message);
  }
}

// Runs `work(t)` in one transaction: commit when it returns, roll back when it throws.
async function inTransaction(work) {
  const t = await sequelize.transaction();
  try {
    const result = await work(t);
    await t.commit();
    return result;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function generateReference() {
  const count = await OfficeExpense.count();
  return `OEXP${String(count + 1).padStart(5, '0')}`;
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

// Read-only snapshot used by the form's budget meter. Mirrors the maths in
// checkBudgetWarning (top-level category + its subcategories, calendar month
// of the expense date) but optionally leaves one expense out, so editing an
// existing record doesn't count it twice.
async function getBudgetStatus(budgetCategoryId, dateValue, excludeId) {
  const category = await BudgetCategory.findByPk(budgetCategoryId);
  if (!category) return { hasBudget: false };
  const topCategory = category.parentId ? await BudgetCategory.findByPk(category.parentId) : category;
  if (!topCategory) return { hasBudget: false };

  // Read year/month straight from a YYYY-MM-DD string so the server's
  // timezone can't push the date into the neighbouring month.
  let year;
  let month;
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(String(dateValue || ''));
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
  } else {
    const d = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(d.getTime())) return { hasBudget: false };
    year = d.getFullYear();
    month = d.getMonth() + 1;
  }

  const base = { categoryName: topCategory.name, year, month };
  const budget = await MonthlyBudget.findOne({ where: { budgetCategoryId: topCategory.id, year, month } });
  if (!budget) return { ...base, hasBudget: false };

  const subs = await BudgetCategory.findAll({ where: { parentId: topCategory.id } });
  const categoryIds = [topCategory.id, ...subs.map((s) => s.id)];

  const where = {
    budgetCategoryId: { [Op.in]: categoryIds },
    date: { [Op.gte]: new Date(year, month - 1, 1), [Op.lt]: new Date(year, month, 1) },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const spent = Number(await OfficeExpense.sum('amount', { where })) || 0;
  const allocated = Number(budget.allocatedAmount) || 0;

  return {
    ...base,
    hasBudget: true,
    budgetStatus: budget.status,
    allocated,
    spent,
    remaining: allocated - spent,
  };
}

// Parses "YYYY-MM-DD" as a local date (same approach as the rest of this file),
// so the server timezone can't shift the day.
function parseDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const listInclude = [{ model: BudgetCategory, as: 'budgetCategory' }];

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateReference() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Must stay above '/:id' so "budget-status" isn't treated as an id.
router.get('/budget-status', auth, async (req, res) => {
  try {
    const { budgetCategory, date, excludeId } = req.query;
    if (!budgetCategory) return res.json({ hasBudget: false });
    res.json(await getBudgetStatus(budgetCategory, date, excludeId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Quick-summary tiles on the Daily Expense Entry page. Rejected expenses are
// left out of the totals; pending is everything still waiting for approval.
// Must stay above '/:id'.
router.get('/summary', auth, async (req, res) => {
  try {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(req.query.date || ''));
    const base = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
    const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    const notRejected = { status: { [Op.ne]: 'rejected' } };

    const [todayTotal, todayCount, monthTotal, pendingTotal, pendingCount] = await Promise.all([
      OfficeExpense.sum('amount', { where: { ...notRejected, date: { [Op.gte]: dayStart, [Op.lt]: dayEnd } } }),
      OfficeExpense.count({ where: { ...notRejected, date: { [Op.gte]: dayStart, [Op.lt]: dayEnd } } }),
      OfficeExpense.sum('amount', { where: { ...notRejected, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } } }),
      OfficeExpense.sum('amount', { where: { status: 'pending' } }),
      OfficeExpense.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      today: { total: Number(todayTotal) || 0, count: todayCount },
      month: { total: Number(monthTotal) || 0 },
      pending: { total: Number(pendingTotal) || 0, count: pendingCount },
      autoApproveAdmin: AUTO_APPROVE_ADMIN,
    });
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

    // Cash deposits / fund receipts recorded against the monthly budget
    const cashReceipts = await MonthlyBudgetCashReceipt.findAll({
      where: { year },
      order: [['receivedDate', 'ASC'], ['createdAt', 'ASC']],
    });

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
      cashReceipts: cashReceipts.map((r) => r.toJSON()),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List expenses. `from` / `to` are YYYY-MM-DD and both days are included.
router.get('/', auth, async (req, res) => {
  try {
    const { budgetCategory, from, to } = req.query;
    const where = {};
    if (budgetCategory) where.budgetCategoryId = budgetCategory;

    const fromDay = parseDay(from);
    const toDay = parseDay(to);
    if (fromDay || toDay) {
      where.date = {};
      if (fromDay) where.date[Op.gte] = fromDay;
      // End date is inclusive: everything before the start of the NEXT day.
      if (toDay) {
        where.date[Op.lt] = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1);
      }
    }

    const rows = await OfficeExpense.findAll({
      where,
      include: listInclude,
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
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

// Create new expense request.
// The expense and its journal entry are saved in one transaction. If the
// ledger step fails, nothing is saved and the error is returned.
router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const {
      title, budgetCategory, amount, reference, date,
      paidTo, billNo, paymentMethod, paymentRef,
    } = req.body;
    const { drAccount, crAccount } = await applyAccountDefaults(req.body);

    if (!budgetCategory) {
      return res.status(400).json({ message: 'Office Budget Category is required' });
    }
    if (!drAccount || !crAccount || !amount) {
      return res.status(400).json({ message: 'Debit account, Credit account and Amount are required' });
    }
    if (!(Number(amount) > 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (drAccount === crAccount) {
      return res.status(400).json({ message: 'Debit and Credit accounts must be different' });
    }

    const isAccountant = req.user?.role === 'accountant';
    const initialStatus = AUTO_APPROVE_ADMIN && isAdminRole(req.user) ? 'approved' : 'pending';
    const finalReference = reference || await generateReference();

    const officeExpense = await inTransaction(async (t) => {
      const row = await OfficeExpense.create({
        title: title || '',
        budgetCategoryId: budgetCategory,
        drAccount,
        crAccount,
        amount: Number(amount),
        reference: finalReference,
        date: date || Date.now(),
        status: initialStatus,
        addedBy: req.user?.name || (isAccountant ? 'Accountant' : 'Admin'),
        attachment: req.file ? `/uploads/office-expenses/${req.file.filename}` : '',
        paidTo: cleanText(paidTo),
        billNo: cleanText(billNo),
        paymentMethod: cleanMethod(paymentMethod),
        paymentRef: cleanText(paymentRef),
      }, { transaction: t });

      // Check both accounts exist even while pending, so approval cannot fail later.
      await resolveAccountIds(row.drAccount, row.crAccount, t);
      await syncLedger(row, req.user, t);
      await row.save({ transaction: t });
      return row;
    });

    let budgetWarning = null;
    try {
      budgetWarning = await checkBudgetWarning(officeExpense);
    } catch { /* non-critical */ }

    await safely(() => logActivity({
      module: 'Expense',
      action: isAccountant ? 'Submitted' : 'Created',
      message: `${isAccountant ? 'Submitted expense request' : 'Added expense'} "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference})`,
      amount: officeExpense.amount,
      budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense',
      relatedId: officeExpense.id,
      performedBy: req.user?.name || 'User',
    }));

    // Notify Admin when an Accountant submits a request
    if (isAccountant) {
      await safely(() => notifyAdmin(
        'OfficeExpenseRequest',
        `New Office Expense request submitted by ${req.user.name || 'Accountant'}: "${officeExpense.title || officeExpense.reference}" (৳${Number(officeExpense.amount).toLocaleString()})`,
        'OfficeExpense',
        officeExpense.id
      ));
    }

    res.status(201).json({ ...officeExpense.toJSON(), budgetWarning });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Update status (Approve / Reject / Pending) — ADMIN ONLY.
// Approving posts the journal entry; rejecting or moving back to pending
// removes it. The status and the ledger change together.
router.patch('/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const normalizedStatus = String(status || '').toLowerCase();
    if (!['approved', 'pending', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Status must be approved, pending, or rejected' });
    }

    const officeExpense = await inTransaction(async (t) => {
      const row = await OfficeExpense.findByPk(req.params.id, { include: listInclude, transaction: t });
      if (!row) throw fail('Expense record not found', 404);
      row.status = normalizedStatus;
      await syncLedger(row, req.user, t);
      await row.save({ transaction: t });
      return row;
    });

    await safely(() => logActivity({
      module: 'Expense',
      action: normalizedStatus === 'approved' ? 'Approved' : normalizedStatus === 'rejected' ? 'Rejected' : 'Updated',
      message: `${normalizedStatus.toUpperCase()} expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference})${remarks ? ` - Note: ${remarks}` : ''}`,
      amount: officeExpense.amount,
      budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense',
      relatedId: officeExpense.id,
      performedBy: req.user?.name || 'Admin',
    }));

    // Notify Accountant about approval / rejection
    if (['approved', 'rejected'].includes(normalizedStatus)) {
      const notifType = normalizedStatus === 'approved' ? 'OfficeExpenseApproved' : 'OfficeExpenseRejected';
      const notifMsg = normalizedStatus === 'approved'
        ? `Your Office Expense "${officeExpense.title || officeExpense.reference}" (৳${Number(officeExpense.amount).toLocaleString()}) was approved by Admin.`
        : `Your Office Expense "${officeExpense.title || officeExpense.reference}" was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await safely(() => notifyAccountant(null, notifType, notifMsg, 'OfficeExpense', officeExpense.id));
    }

    res.json(officeExpense);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Edit expense record. An approved expense gets its journal entry rebuilt
// from the new values in the same transaction.
router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const isNonAdmin = !isAdminRole(req.user);
    let previousAmount = 0;

    const officeExpense = await inTransaction(async (t) => {
      const row = await OfficeExpense.findByPk(req.params.id, { transaction: t });
      if (!row) throw fail('Not found', 404);

      if (isNonAdmin && String(row.status).toLowerCase() === 'approved') {
        throw fail('Approved expenses cannot be modified by Accountant. Contact Admin.', 403);
      }

      previousAmount = Number(row.amount);
      const fields = [
        'title', 'drAccount', 'crAccount', 'amount', 'reference', 'date',
        'paidTo', 'billNo', 'paymentRef',
      ];

      // Only Admin can manually update status through PUT
      if (!isNonAdmin && req.body.status !== undefined) {
        fields.push('status');
      }

      fields.forEach((key) => {
        if (req.body[key] !== undefined) row[key] = req.body[key];
      });

      if (req.body.paymentMethod !== undefined) {
        row.paymentMethod = cleanMethod(req.body.paymentMethod);
      }

      if (req.body.budgetCategory !== undefined) {
        if (!req.body.budgetCategory) throw fail('Office Budget Category is required');
        row.budgetCategoryId = req.body.budgetCategory;
      }

      if (!(Number(row.amount) > 0)) throw fail('Amount must be greater than 0');
      if (row.drAccount && row.drAccount === row.crAccount) {
        throw fail('Debit and Credit accounts must be different');
      }

      if (req.file) row.attachment = `/uploads/office-expenses/${req.file.filename}`;

      // If an Accountant edits a previously rejected item, move it back to 'pending'
      if (isNonAdmin && String(row.status).toLowerCase() === 'rejected') {
        row.status = 'pending';
      }

      await resolveAccountIds(row.drAccount, row.crAccount, t);
      await syncLedger(row, req.user, t);
      await row.save({ transaction: t });
      return row;
    });

    let budgetWarning = null;
    try {
      budgetWarning = await checkBudgetWarning(officeExpense);
    } catch { /* non-critical */ }

    await safely(() => logActivity({
      module: 'Expense',
      action: 'Updated',
      message: `Updated expense "${officeExpense.title || officeExpense.reference}" (${officeExpense.reference}) — ৳${previousAmount.toLocaleString()} → ৳${Number(officeExpense.amount).toLocaleString()}`,
      amount: officeExpense.amount,
      budgetCategoryId: officeExpense.budgetCategoryId,
      relatedType: 'OfficeExpense',
      relatedId: officeExpense.id,
      performedBy: req.user?.name || 'User',
    }));

    // Notify Admin if an Accountant re-submitted an edited request
    if (isNonAdmin) {
      await safely(() => notifyAdmin(
        'OfficeExpenseRequest',
        `Expense request resubmitted by ${req.user.name || 'Accountant'}: "${officeExpense.title || officeExpense.reference}" (৳${Number(officeExpense.amount).toLocaleString()})`,
        'OfficeExpense',
        officeExpense.id
      ));
    }

    res.json({ ...officeExpense.toJSON(), budgetWarning });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Delete expense record (its journal entry is removed in the same transaction)
router.delete('/:id', auth, async (req, res) => {
  try {
    const isNonAdmin = !isAdminRole(req.user);

    const snapshot = await inTransaction(async (t) => {
      const row = await OfficeExpense.findByPk(req.params.id, { transaction: t });
      if (!row) throw fail('Not found', 404);

      if (isNonAdmin && String(row.status).toLowerCase() === 'approved') {
        throw fail('Approved expenses cannot be deleted by Accountant. Contact Admin.', 403);
      }

      await unpostExpense(row, t);
      const data = row.toJSON();
      await row.destroy({ transaction: t });
      return data;
    });

    await safely(() => logActivity({
      module: 'Expense',
      action: 'Deleted',
      message: `Deleted expense "${snapshot.title || snapshot.reference}" (${snapshot.reference})`,
      amount: snapshot.amount,
      budgetCategoryId: snapshot.budgetCategoryId,
      relatedType: 'OfficeExpense',
      relatedId: snapshot.id,
      performedBy: req.user?.name || 'User',
    }));

    res.json({ deleted: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;