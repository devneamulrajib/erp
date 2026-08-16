const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Brand = require('../models/Brand');

function generateCode() {
  return 'BR' + Math.floor(100000000 + Math.random() * 900000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const brands = await Brand.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const brand = await Brand.create({
      name,
      code: code || generateCode(),
    });

    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) brand[key] = req.body[key];
    });

    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Brand.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;