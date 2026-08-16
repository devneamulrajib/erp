const router = require('express').Router();
const auth = require('../middleware/auth');
const { BillItem, Category, Brand, Unit } = require('../models/associations');

async function generateCode() {
  const count = await BillItem.count();
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
    const items = await BillItem.findAll({
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
        { model: Unit, attributes: ['name'] },
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
    const { category, brand, name, unit, purchasePrice, salePrice, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Item Name is required' });

    const item = await BillItem.create({
      code: await generateCode(),
      categoryId: category || null,
      brandId: brand || null,
      name,
      unitId: unit || null,
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
    const item = await BillItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (req.body.category !== undefined) item.categoryId = req.body.category;
    if (req.body.brand !== undefined) item.brandId = req.body.brand;
    if (req.body.unit !== undefined) item.unitId = req.body.unit;
    const fields = ['name', 'purchasePrice', 'salePrice', 'description'];
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
    const deleted = await BillItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;