const router = require('express').Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await Campaign.find(filter)
      .populate('leadSourceId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      name, leadSourceId, description, formId, status,
    } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const item = await Campaign.create({
      name,
      leadSourceId: leadSourceId || undefined,
      description,
      formId,
      status,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await item.populate('leadSourceId', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Campaign.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    ['name', 'leadSourceId', 'description', 'formId', 'status'].forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key] || undefined;
    });

    await item.save();
    const populated = await item.populate('leadSourceId', 'name');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Campaign.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;