// server/routes/monthlyBudget.js
const router = require('express').Router();
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const { BudgetCategory, MonthlyBudget, OfficeExpense } = require('../models/associations');
const MonthlyBudgetAuditLog = require('../models/MonthlyBudgetAuditLog');
const MonthlyBudgetCashReceipt = require('../models/MonthlyBudgetCashReceipt');
const logActivity = require('../utils/activityLog');

// -------------------------------------------------------------
// Summary & Audit Logs
// -------------------------------------------------------------

router.get('/summary', auth, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const allCategories = await BudgetCategory.findAll({ order: [['name', 'ASC']] });
    const topCategories = allCategories.filter((c) => !c.parentId);
    const subsByParent = {};
    allCategories.forEach((c) => {
      if (c.parentId) (subsByParent[c.parentId] = subsByParent[c.parentId] || []).push(c);
    });

    const budgets = await MonthlyBudget.findAll({ where: { year, month } });
    const budgetByCategory = Object.fromEntries(budgets.map((b) => [b.budgetCategoryId, b]));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    async function spentFor(categoryId) {
      const spent = await OfficeExpense.sum('amount', {
        where: { budgetCategoryId: categoryId, date: { [Op.gte]: startDate, [Op.lt]: endDate } },
      });
      return Number(spent) || 0;
    }

    // Cash receipts for the month, split into per-category tagged amounts
    // and an untagged "General Office Fund" bucket (budgetCategoryId: null).
    const cashReceipts = await MonthlyBudgetCashReceipt.findAll({ where: { year, month } });
    const cashByCategory = {};
    let generalCashReceived = 0;
    cashReceipts.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.budgetCategoryId) {
        cashByCategory[r.budgetCategoryId] = (cashByCategory[r.budgetCategoryId] || 0) + amt;
      } else {
        generalCashReceived += amt;
      }
    });

    const rows = await Promise.all(
      topCategories.map(async (cat) => {
        const subs = subsByParent[cat.id] || [];
        const ownSpent = await spentFor(cat.id);
        const subSpent = await Promise.all(
          subs.map(async (s) => ({
            budgetCategoryId: s.id,
            name: s.name,
            spentAmount: await spentFor(s.id),
          }))
        );
        const subtotalSubSpent = subSpent.reduce((sum, s) => sum + s.spentAmount, 0);
        const spentAmount = ownSpent + subtotalSubSpent;

        const budget = budgetByCategory[cat.id];
        const allocated = budget ? Number(budget.allocatedAmount) : 0;
        const cashReceivedAmount = cashByCategory[cat.id] || 0;

        return {
          budgetCategoryId: cat.id,
          name: cat.name,
          description: cat.description,
          monthlyBudgetId: budget ? budget.id : null,
          allocatedAmount: allocated,
          note: budget ? budget.note : '',
          status: budget ? budget.status : 'Approved',
          requestedAmount: budget ? budget.requestedAmount : null,
          requestedBy: budget ? budget.requestedBy : null,
          rejectedBy: budget ? budget.rejectedBy : null,
          rejectedAt: budget ? budget.rejectedAt : null,
          rejectionReason: budget ? budget.rejectionReason : null,
          spentAmount,
          cashReceivedAmount,
          remainingAmount: allocated - spentAmount,
          subcategories: subSpent,
        };
      })
    );

    const totalCashReceived = cashReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totals = rows.reduce(
      (acc, r) => ({
        allocatedAmount: acc.allocatedAmount + r.allocatedAmount,
        spentAmount: acc.spentAmount + r.spentAmount,
        remainingAmount: acc.remainingAmount + r.remainingAmount,
      }),
      { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 }
    );

    totals.cashReceivedAmount = Number(totalCashReceived) || 0;
    totals.generalCashReceived = Number(generalCashReceived) || 0;
    totals.cashInHand = totals.cashReceivedAmount - totals.spentAmount;
    totals.pendingCash = Math.max(0, totals.allocatedAmount - totals.cashReceivedAmount);

    res.json({ year, month, rows, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// History of who set/changed/deleted a category's allocation
router.get('/logs', auth, async (req, res) => {
  try {
    const { budgetCategoryId, year, month } = req.query;
    if (!budgetCategoryId || !year || !month) {
      return res.status(400).json({ message: 'budgetCategoryId, year and month are required' });
    }
    const logs = await MonthlyBudgetAuditLog.findAll({
      where: { budgetCategoryId, year, month },
      order: [['createdAt', 'DESC']],
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// Budget Allocation & Requests
// -------------------------------------------------------------

// 1. Direct allocation (Admin / Superadmin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { budgetCategoryId, year, month, allocatedAmount, note } = req.body;
    if (!budgetCategoryId || !year || !month) {
      return res.status(400).json({ message: 'Budget category, year and month are required' });
    }

    const category = await BudgetCategory.findByPk(budgetCategoryId);
    if (!category) return res.status(404).json({ message: 'Budget category not found' });
    if (category.parentId) {
      return res.status(400).json({ message: 'Budgets are allocated on the parent category, not a subcategory' });
    }

    const performedBy = req.user?.name || 'Admin';
    const nextAmount = Number(allocatedAmount) || 0;

    let budget = await MonthlyBudget.findOne({ where: { budgetCategoryId, year, month } });
    let action;
    let previousAmount = null;

    if (budget) {
      previousAmount = Number(budget.allocatedAmount);
      budget.allocatedAmount = nextAmount;
      if (note !== undefined) budget.note = note;
      // Direct allocation always approves and settles any outstanding pending/rejected requests
      budget.status = 'Approved';
      await budget.save();
      action = 'Updated';
    } else {
      budget = await MonthlyBudget.create({
        budgetCategoryId,
        year,
        month,
        allocatedAmount: nextAmount,
        note: note || '',
        addedBy: performedBy,
        status: 'Approved',
      });
      action = 'Created';
    }

    await MonthlyBudgetAuditLog.create({
      monthlyBudgetId: budget.id,
      budgetCategoryId,
      year,
      month,
      action,
      previousAmount,
      newAmount: nextAmount,
      note: note || '',
      performedBy,
    });

    await logActivity({
      module: 'Budget',
      action,
      message: action === 'Created'
        ? `Set ${category.name} budget for ${month}/${year} to ৳${nextAmount.toLocaleString()}`
        : `Changed ${category.name} budget for ${month}/${year} from ৳${(previousAmount || 0).toLocaleString()} to ৳${nextAmount.toLocaleString()}`,
      amount: nextAmount,
      budgetCategoryId,
      relatedType: 'MonthlyBudget',
      relatedId: budget.id,
      performedBy,
    });

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Submit budget request (Accountant & Admin allowed)
router.post('/request', auth, async (req, res) => {
  try {
    const { budgetCategoryId, year, month, requestedAmount, note } = req.body;
    if (!budgetCategoryId || !year || !month || !requestedAmount) {
      return res.status(400).json({ message: 'Category, year, month and requestedAmount are required' });
    }
    const performedBy = req.user?.name || 'Admin';

    let budget = await MonthlyBudget.findOne({ where: { budgetCategoryId, year, month } });
    if (budget) {
      budget.requestedAmount = Number(requestedAmount);
      budget.status = 'Pending';
      budget.requestedBy = performedBy;
      budget.note = note || budget.note;
      // Clear any previous rejection information
      budget.rejectedBy = null;
      budget.rejectedAt = null;
      budget.rejectionReason = null;
      await budget.save();
    } else {
      budget = await MonthlyBudget.create({
        budgetCategoryId,
        year,
        month,
        allocatedAmount: 0,
        requestedAmount: Number(requestedAmount),
        status: 'Pending',
        requestedBy: performedBy,
        note: note || '',
        addedBy: performedBy,
      });
    }

    await logActivity({
      module: 'Budget',
      action: 'Requested',
      message: `Requested ৳${Number(requestedAmount).toLocaleString()} budget for ${month}/${year}`,
      amount: requestedAmount,
      budgetCategoryId,
      relatedType: 'MonthlyBudget',
      relatedId: budget.id,
      performedBy,
    });

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Approve request (Admin / Superadmin only)
router.post('/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const budget = await MonthlyBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Not found' });
    if (budget.status !== 'Pending') {
      return res.status(400).json({ message: 'This request is not pending' });
    }
    const performedBy = req.user?.name || 'Admin';
    const requested = Number(budget.requestedAmount) || 0;
    const { approvedAmount, note } = req.body;
    const amount = approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
      ? Number(approvedAmount)
      : requested;

    budget.allocatedAmount = amount;
    budget.status = 'Approved';
    budget.approvedBy = performedBy;
    budget.approvedAt = new Date();
    if (note) budget.note = note;
    await budget.save();

    const adjustedNote = amount !== requested
      ? `Approved from payroll request (adjusted from ৳${requested.toLocaleString()} to ৳${amount.toLocaleString()})`
      : 'Approved from payroll request';

    await MonthlyBudgetAuditLog.create({
      monthlyBudgetId: budget.id,
      budgetCategoryId: budget.budgetCategoryId,
      year: budget.year,
      month: budget.month,
      action: 'Approved',
      previousAmount: 0,
      newAmount: amount,
      note: note || adjustedNote,
      performedBy,
    });

    await logActivity({
      module: 'Budget',
      action: 'Approved',
      message: `Approved budget request of ৳${amount.toLocaleString()} for ${budget.month}/${budget.year}${amount !== requested ? ` (requested ৳${requested.toLocaleString()})` : ''}`,
      amount,
      budgetCategoryId: budget.budgetCategoryId,
      relatedType: 'MonthlyBudget',
      relatedId: budget.id,
      performedBy,
    });

    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Reject request (Admin / Superadmin only)
router.post('/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const budget = await MonthlyBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Not found' });
    if (budget.status !== 'Pending') {
      return res.status(400).json({ message: 'This request is not pending' });
    }
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A rejection reason is required' });
    }
    const performedBy = req.user?.name || 'Admin';
    const requested = Number(budget.requestedAmount) || 0;

    budget.status = 'Rejected';
    budget.rejectedBy = performedBy;
    budget.rejectedAt = new Date();
    budget.rejectionReason = reason.trim();
    await budget.save();

    await MonthlyBudgetAuditLog.create({
      monthlyBudgetId: budget.id,
      budgetCategoryId: budget.budgetCategoryId,
      year: budget.year,
      month: budget.month,
      action: 'Rejected',
      previousAmount: requested,
      newAmount: null,
      note: reason.trim(),
      performedBy,
    });

    await logActivity({
      module: 'Budget',
      action: 'Rejected',
      message: `Rejected budget request of ৳${requested.toLocaleString()} for ${budget.month}/${budget.year}: ${reason.trim()}`,
      amount: requested,
      budgetCategoryId: budget.budgetCategoryId,
      relatedType: 'MonthlyBudget',
      relatedId: budget.id,
      performedBy,
    });

    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Delete allocation (Admin / Superadmin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const budget = await MonthlyBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Not found' });

    await MonthlyBudgetAuditLog.create({
      monthlyBudgetId: budget.id,
      budgetCategoryId: budget.budgetCategoryId,
      year: budget.year,
      month: budget.month,
      action: 'Deleted',
      previousAmount: Number(budget.allocatedAmount),
      newAmount: null,
      note: req.body?.note || '',
      performedBy: req.user?.name || 'Admin',
    });

    const category = await BudgetCategory.findByPk(budget.budgetCategoryId);
    await logActivity({
      module: 'Budget',
      action: 'Deleted',
      message: `Removed ${category?.name || 'budget'} allocation of ৳${Number(budget.allocatedAmount).toLocaleString()} for ${budget.month}/${budget.year}`,
      amount: budget.allocatedAmount,
      budgetCategoryId: budget.budgetCategoryId,
      relatedType: 'MonthlyBudget',
      relatedId: budget.id,
      performedBy: req.user?.name || 'Admin',
    });

    await budget.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// Cash Receipts / Fund Receipts
// -------------------------------------------------------------

// Get all cash receipts for a month
router.get('/cash-receipts', auth, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const receipts = await MonthlyBudgetCashReceipt.findAll({
      where: { year, month },
      order: [['receivedDate', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create cash receipt
router.post('/cash-receipts', auth, async (req, res) => {
  try {
    const {
      year,
      month,
      amount,
      receivedDate,
      receivedFrom,
      paymentMethod,
      referenceNo,
      note,
      budgetCategoryId,
    } = req.body;

    if (!year || !month || !amount) {
      return res.status(400).json({ message: 'Year, month, and amount are required' });
    }

    const receipt = await MonthlyBudgetCashReceipt.create({
      year: Number(year),
      month: Number(month),
      budgetCategoryId: budgetCategoryId ? Number(budgetCategoryId) : null,
      amount: Number(amount) || 0,
      receivedDate: receivedDate || new Date().toISOString().slice(0, 10),
      receivedFrom: receivedFrom || 'Management',
      paymentMethod: paymentMethod || 'Cash',
      referenceNo: referenceNo || '',
      note: note || '',
      receivedBy: req.user?.name || 'Accounts Manager',
    });

    await logActivity({
      module: 'Budget',
      action: 'CashReceived',
      message: `Recorded cash receipt of ৳${Number(receipt.amount).toLocaleString()} from ${receipt.receivedFrom} for ${month}/${year}`,
      amount: receipt.amount,
      budgetCategoryId: receipt.budgetCategoryId,
      relatedType: 'MonthlyBudgetCashReceipt',
      relatedId: receipt.id,
      performedBy: req.user?.name || 'Accounts Manager',
    });

    res.status(201).json(receipt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update cash receipt
router.put('/cash-receipts/:id', auth, async (req, res) => {
  try {
    const receipt = await MonthlyBudgetCashReceipt.findByPk(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Cash receipt not found' });

    const {
      amount,
      receivedDate,
      receivedFrom,
      paymentMethod,
      referenceNo,
      note,
      budgetCategoryId,
    } = req.body;

    if (amount !== undefined) receipt.amount = Number(amount) || 0;
    if (receivedDate !== undefined) receipt.receivedDate = receivedDate;
    if (receivedFrom !== undefined) receipt.receivedFrom = receivedFrom;
    if (paymentMethod !== undefined) receipt.paymentMethod = paymentMethod;
    if (referenceNo !== undefined) receipt.referenceNo = referenceNo;
    if (note !== undefined) receipt.note = note;
    if (budgetCategoryId !== undefined) {
      receipt.budgetCategoryId = budgetCategoryId ? Number(budgetCategoryId) : null;
    }

    await receipt.save();

    await logActivity({
      module: 'Budget',
      action: 'CashReceiptUpdated',
      message: `Updated cash receipt #${receipt.id} (৳${Number(receipt.amount).toLocaleString()}) for ${receipt.month}/${receipt.year}`,
      amount: receipt.amount,
      budgetCategoryId: receipt.budgetCategoryId,
      relatedType: 'MonthlyBudgetCashReceipt',
      relatedId: receipt.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.json(receipt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete cash receipt
router.delete('/cash-receipts/:id', auth, async (req, res) => {
  try {
    const receipt = await MonthlyBudgetCashReceipt.findByPk(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Cash receipt not found' });

    await logActivity({
      module: 'Budget',
      action: 'CashReceiptDeleted',
      message: `Deleted cash receipt #${receipt.id} (৳${Number(receipt.amount).toLocaleString()}) for ${receipt.month}/${receipt.year}`,
      amount: receipt.amount,
      budgetCategoryId: receipt.budgetCategoryId,
      relatedType: 'MonthlyBudgetCashReceipt',
      relatedId: receipt.id,
      performedBy: req.user?.name || 'Admin',
    });

    await receipt.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;