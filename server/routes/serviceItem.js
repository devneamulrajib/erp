const router = require('express').Router();
const auth = require('../middleware/auth');
const { ServiceItem, Category, Unit } = require('../models/associations');

async function generateCode() {
  const count = await ServiceItem.count();
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
    const items = await ServiceItem.findAll({
      include: [
        { model: Category, as: 'category', attributes: ['name'] },
        { model: Unit, as: 'unit', attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
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
      categoryId: category || null,
      name,
      unitId: unit || null,
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
    const item = await ServiceItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (req.body.category !== undefined) item.categoryId = req.body.category;
    if (req.body.unit !== undefined) item.unitId = req.body.unit;
    ['name', 'cost', 'salePrice'].forEach((key) => {
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
    const deleted = await ServiceItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;