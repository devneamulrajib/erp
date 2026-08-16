const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Party, ChartOfGroup } = require('../models/associations');

function generateCode() {
  return 'PTY' + Math.floor(100000 + Math.random() * 900000);
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

    const parties = await Party.findAll({
      where,
      include: [{ model: ChartOfGroup, attributes: ['name'] }],
      order: [['name', 'ASC']],
    });
    res.json(parties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const party = await Party.findByPk(req.params.id, {
      include: [{ model: ChartOfGroup, attributes: ['name'] }],
    });
    if (!party) return res.status(404).json({ message: 'Not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, address, openingBalance, creditLimit, dueDate, chartGroup, type, code } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const party = await Party.create({
      code: code || generateCode(),
      name, phone, address,
      openingBalance: openingBalance || 0,
      creditLimit: creditLimit || 0,
      dueDate,
      chartGroupId: chartGroup || null,
      type: type || 'contractor',
    });

    const populated = await Party.findByPk(party.id, {
      include: [{ model: ChartOfGroup, attributes: ['name'] }],
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const party = await Party.findByPk(req.params.id);
    if (!party) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'phone', 'address', 'openingBalance', 'creditLimit', 'dueDate', 'type'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) party[key] = req.body[key];
    });
    if (req.body.chartGroup !== undefined) party.chartGroupId = req.body.chartGroup;

    await party.save();
    const populated = await Party.findByPk(party.id, {
      include: [{ model: ChartOfGroup, attributes: ['name'] }],
    });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Party.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;