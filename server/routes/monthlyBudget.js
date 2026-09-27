const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { BudgetCategory, MonthlyBudget, OfficeExpense } = require('../models/associations');
const MonthlyBudgetAuditLog = require('../models/MonthlyBudgetAuditLog');

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

    const rows = await Promise.all(topCategories.map(async (cat) => {
      const subs = subsByParent[cat.id] || [];
      const ownSpent = await spentFor(cat.id);
      const subSpent = await Promise.all(subs.map(async (s) => ({
        budgetCategoryId: s.id,
        name: s.name,
        spentAmount: await spentFor(s.id),
      })));
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
    }));

    const totals = rows.reduce((acc, r) => ({
      allocatedAmount: acc.allocatedAmount + r.allocatedAmount,
      spentAmount: acc.spentAmount + r.spentAmount,
      remainingAmount: acc.remainingAmount + r.remainingAmount,
    }), { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 });

    res.json({ year, month, rows, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// History of who set/changed/deleted a category's allocation for a given period.
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

module.exports = router;