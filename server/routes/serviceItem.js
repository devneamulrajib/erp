const router = require('express').Router();
const auth = require('../middleware/auth');
const ServiceItem = require('../models/ServiceItem');

async function generateCode() {
  const count = await ServiceItem.countDocuments();
  return `S${String(count + 1).padStart(4, '0')}`;
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
    const items = await ServiceItem.find()
      .populate('category', 'name')
      .populate('unit', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category, name, unit, cost, salePrice } = req.body;
    if (!name) return res.status(400).json({ message: 'Service Name is required' });

    const item = await ServiceItem.create({
      code: await generateCode(),
      category: category || null,
      name,
      unit: unit || null,
      cost: cost || 0,
      salePrice: salePrice || 0,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await ServiceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['category', 'name', 'unit', 'cost', 'salePrice'];
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
    const deleted = await ServiceItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;