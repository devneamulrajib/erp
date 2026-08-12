const router = require('express').Router();
const auth = require('../middleware/auth');
const LeadSource = require('../models/LeadSource');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await LeadSource.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const item = await LeadSource.create({
      name,
      status,
      addedBy: req.user?.name || 'Admin',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await LeadSource.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    ['name', 'status'].forEach((key) => {
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
    const deleted = await LeadSource.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;