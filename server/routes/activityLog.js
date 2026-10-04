const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const { BudgetCategory } = require('../models/associations');

router.get('/', auth, async (req, res) => {
  try {
    const { year, month, module: mod, budgetCategoryId, limit } = req.query;
    const where = {};
    if (mod) where.module = mod;
    if (budgetCategoryId) where.budgetCategoryId = budgetCategoryId;
    if (year) {
      const y = Number(year);
      const m = month ? Number(month) : null;
      const start = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
      const end = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
      where.createdAt = { [Op.gte]: start, [Op.lt]: end };
    }

    const rows = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(limit) || 100, 300),
    });

    // Attach category names in one extra query rather than a join, since
    // ActivityLog has no formal association (keeps it decoupled/lightweight).
    const categoryIds = [...new Set(rows.map((r) => r.budgetCategoryId).filter(Boolean))];
    const categories = categoryIds.length
      ? await BudgetCategory.findAll({ where: { id: categoryIds }, attributes: ['id', 'name'] })
      : [];
    const nameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    res.json(rows.map((r) => ({ ...r.toJSON(), budgetCategoryName: nameById[r.budgetCategoryId] || null })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;