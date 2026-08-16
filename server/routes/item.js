const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Item, Category, Brand } = require('../models/associations');

const TYPE_PREFIX = { Material: 'M', Product: 'P', Service: 'S' };

async function generateCode(categoryId) {
  const category = await Category.findByPk(categoryId);
  const prefix = TYPE_PREFIX[category?.type] || 'M';
  const count = await Item.count({ where: { code: { [Op.like]: `${prefix}%` } } });
  return prefix + String(count + 1).padStart(4, '0');
}

router.get('/', auth, async (req, res) => {
  try {
    const { category, brand, search } = req.query;
    const where = {};
    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await Item.findAll({
      where,
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
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
    const { category, brand, name, unit, purchasePrice, salePrice, code } = req.body;
    if (!category || !name || !unit) {
      return res.status(400).json({ message: 'Category, Name and Unit are required' });
    }

    const item = await Item.create({
      code: code || (await generateCode(category)),
      categoryId: category,
      brandId: brand || null,
      name,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
    });

    const populated = await Item.findByPk(item.id, {
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
      ],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (req.body.category !== undefined) item.categoryId = req.body.category;
    if (req.body.brand !== undefined) item.brandId = req.body.brand;
    const fields = ['name', 'unit', 'purchasePrice', 'salePrice', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });

    await item.save();
    const populated = await Item.findByPk(item.id, {
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
      ],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Item.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;