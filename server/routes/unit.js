const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Unit = require('../models/Unit');

function generateCode() {
  return 'C' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const units = await Unit.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code, conversionUnit, rate } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const unit = await Unit.create({
      name,
      code: code || generateCode(),
      conversionUnit: conversionUnit || '',
      rate: Number(rate) || 0,
    });

    res.status(201).json(unit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'code', 'conversionUnit', 'rate'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) unit[key] = req.body[key];
    });

    await unit.save();
    res.json(unit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Unit.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;