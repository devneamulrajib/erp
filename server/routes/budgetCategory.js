const router = require('express').Router();
const auth = require('../middleware/auth');
const { BudgetCategory } = require('../models/associations');
const logActivity = require('../utils/activityLog');

router.get('/', auth, async (req, res) => {
  try {
    const items = await BudgetCategory.findAll({ order: [['name', 'ASC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const category = await BudgetCategory.create({
      name,
      description: description || '',
      parentId: parentId || null,
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
    const { name, description, parentId } = req.body;
    const previousName = category.name;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (parentId !== undefined) category.parentId = parentId || null;
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