const router = require('express').Router();
const auth = require('../middleware/auth');
const LeadCategory = require('../models/LeadCategory');

function generateCode() {
  return 'LC' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await LeadCategory.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('GET /api/lead-category failed:', err); // will print the real cause to your server terminal
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, code } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const item = await LeadCategory.create({
      name,
      description,
      code: code || generateCode(),
      addedBy: req.user?.name || 'Admin',
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('POST /api/lead-category failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await LeadCategory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'description', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });

    await item.save();
    res.json(item);
  } catch (err) {
    console.error('PUT /api/lead-category failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await LeadCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/lead-category failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;