// server/routes/monthlyBudget.js
const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { BudgetCategory, MonthlyBudget, OfficeExpense } = require('../models/associations');
const MonthlyBudgetAuditLog = require('../models/MonthlyBudgetAuditLog');
const MonthlyBudgetCashReceipt = require('../models/MonthlyBudgetCashReceipt');

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

        return {
          budgetCategoryId: cat.id,
          name: cat.name,
          description: cat.description,
          monthlyBudgetId: budget ? budget.id : null,
          allocatedAmount: allocated,
          note: budget ? budget.note : '',
          spentAmount,
          remainingAmount: allocated - spentAmount,
          subcategories: subSpent,
        };
      })
    );

    // Fetch total cash disbursed/received for this month
    const totalCashReceived =
      (await MonthlyBudgetCashReceipt.sum('amount', {
        where: { year, month },
      })) || 0;

    const totals = rows.reduce(
      (acc, r) => ({
        allocatedAmount: acc.allocatedAmount + r.allocatedAmount,
        spentAmount: acc.spentAmount + r.spentAmount,
        remainingAmount: acc.remainingAmount + r.remainingAmount,
      }),
      { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 }
    );

    totals.cashReceivedAmount = Number(totalCashReceived) || 0;
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

router.post('/', auth, async (req, res) => {
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

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
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

    await budget.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// CASH INFLOW / FUND RECEIPT ENDPOINTS
// ==========================================

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

    await receipt.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;