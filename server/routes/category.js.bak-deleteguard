const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Category = require('../models/Category');

function generateCode() {
  return 'C' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const categories = await Category.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { type, name, code } = req.body;
    if (!type || !name) {
      return res.status(400).json({ message: 'Type and Name are required' });
    }

    const category = await Category.create({
      type,
      name,
      code: code || generateCode(),
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });

    const fields = ['type', 'name', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) category[key] = req.body[key];
    });

    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Category.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;