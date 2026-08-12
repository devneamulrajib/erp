const router = require('express').Router();
const auth = require('../middleware/auth');
const Item = require('../models/Item');
const Category = require('../models/Category');

const TYPE_PREFIX = { Material: 'M', Product: 'P', Service: 'S' };

async function generateCode(categoryId) {
  const category = await Category.findById(categoryId);
  const prefix = TYPE_PREFIX[category?.type] || 'M';
  const count = await Item.countDocuments({ code: { $regex: `^${prefix}` } });
  return prefix + String(count + 1).padStart(4, '0');
}

router.get('/', auth, async (req, res) => {
  try {
    const { category, brand, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await Item.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category, brand, name, unit, purchasePrice, salePrice, code } = req.body;
    if (!category || !name || !unit) {
      return res.status(400).json({ message: 'Category, Name and Unit are required' });
    }

    const item = await Item.create({
      code: code || (await generateCode(category)),
      category,
      brand: brand || undefined,
      name,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
    });

    const populated = await item.populate([
      { path: 'category', select: 'name' },
      { path: 'brand', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['category', 'brand', 'name', 'unit', 'purchasePrice', 'salePrice', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });

    await item.save();
    const populated = await item.populate([
      { path: 'category', select: 'name' },
      { path: 'brand', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;