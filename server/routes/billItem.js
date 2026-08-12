const router = require('express').Router();
const auth = require('../middleware/auth');
const BillItem = require('../models/BillItem');

async function generateCode() {
  const count = await BillItem.countDocuments();
  return `P${String(count + 1).padStart(4, '0')}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateCode() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await BillItem.find()
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('unit', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category, brand, name, unit, purchasePrice, salePrice, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Item Name is required' });

    const item = await BillItem.create({
      code: await generateCode(),
      category: category || null,
      brand: brand || null,
      name,
      unit: unit || null,
      purchasePrice: purchasePrice || 0,
      salePrice: salePrice || 0,
      description: description || '',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await BillItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['category', 'brand', 'name', 'unit', 'purchasePrice', 'salePrice', 'description'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BillItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;