const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const { BudgetCategory } = require('../models/associations');
const OfficeAccountDefault = require('../models/OfficeAccountDefault');
const logActivity = require('../utils/activityLog');

const cleanAccount = (v) => {
  const s = String(v ?? '').trim();
  return s || null;
};

router.get('/', auth, async (req, res) => {
  try {
    const items = await BudgetCategory.findAll({ order: [['name', 'ASC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Credit-side defaults per payment channel (must stay above '/:id') ----
router.get('/account-defaults', auth, async (req, res) => {
  try {
    const row = await OfficeAccountDefault.findOne();
    res.json({
      cashAccount: row?.cashAccount || '',
      bankAccount: row?.bankAccount || '',
      chequeAccount: row?.chequeAccount || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/account-defaults', auth, requireAdmin, async (req, res) => {
  try {
    const { cashAccount, bankAccount, chequeAccount } = req.body;
    let row = await OfficeAccountDefault.findOne();
    if (!row) row = await OfficeAccountDefault.create({});

    if (cashAccount !== undefined) row.cashAccount = cleanAccount(cashAccount);
    if (bankAccount !== undefined) row.bankAccount = cleanAccount(bankAccount);
    if (chequeAccount !== undefined) row.chequeAccount = cleanAccount(chequeAccount);
    await row.save();

    try {
      await logActivity({
        module: 'Category', action: 'Updated',
        message: 'Updated default payment accounts (cash / bank / cheque)',
        relatedType: 'OfficeAccountDefault', relatedId: row.id,
        performedBy: req.user?.name || 'Admin',
      });
    } catch { /* logging must never block a save */ }

    res.json({
      cashAccount: row.cashAccount || '',
      bankAccount: row.bankAccount || '',
      chequeAccount: row.chequeAccount || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, parentId, defaultDrAccount } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const category = await BudgetCategory.create({
      name,
      description: description || '',
      parentId: parentId || null,
      defaultDrAccount: cleanAccount(defaultDrAccount),
    });

    await logActivity({
      module: 'Category', action: 'Created',
      message: `Created budget category "${category.name}"${parentId ? ' (subcategory)' : ''}`,
      budgetCategoryId: category.parentId || category.id,
      relatedType: 'BudgetCategory', relatedId: category.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const category = await BudgetCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });
    const { name, description, parentId, defaultDrAccount } = req.body;
    const previousName = category.name;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (parentId !== undefined) category.parentId = parentId || null;
    if (defaultDrAccount !== undefined) category.defaultDrAccount = cleanAccount(defaultDrAccount);
    await category.save();

    await logActivity({
      module: 'Category', action: 'Updated',
      message: name !== undefined && name !== previousName
        ? `Renamed budget category "${previousName}" to "${category.name}"`
        : `Updated budget category "${category.name}"`,
      budgetCategoryId: category.parentId || category.id,
      relatedType: 'BudgetCategory', relatedId: category.id,
      performedBy: req.user?.name || 'Admin',
    });

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await BudgetCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });

    // Don't leave orphaned subcategories pointing at a deleted parent —
    // promote them to top-level instead of silently breaking their parentId.
    await BudgetCategory.update({ parentId: null }, { where: { parentId: category.id } });

    await logActivity({
      module: 'Category', action: 'Deleted',
      message: `Deleted budget category "${category.name}"`,
      budgetCategoryId: category.parentId || category.id,
      relatedType: 'BudgetCategory', relatedId: category.id,
      performedBy: req.user?.name || 'Admin',
    });

    await category.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;