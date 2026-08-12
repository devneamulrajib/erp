const router = require('express').Router();
const auth = require('../middleware/auth');
const Party = require('../models/Party');

function generateCode() {
  return 'PTY' + Math.floor(100000 + Math.random() * 900000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const parties = await Party.find(filter).populate('chartGroup', 'name').sort({ name: 1 });
    res.json(parties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const party = await Party.findById(req.params.id).populate('chartGroup', 'name');
    if (!party) return res.status(404).json({ message: 'Not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const party = await Party.create({
      ...req.body,
      code: req.body.code || generateCode(),
    });
    const populated = await party.populate('chartGroup', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'phone', 'address', 'openingBalance', 'creditLimit', 'dueDate', 'chartGroup', 'type'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) party[key] = req.body[key];
    });

    await party.save();
    const populated = await party.populate('chartGroup', 'name');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Party.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;