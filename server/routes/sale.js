const router = require('express').Router();
const auth = require('../middleware/auth');
const Sale = require('../models/Sale');

async function generateSaleCode() {
  // Matches the "SaleXXXXXXX" random 7-digit style already used in your UI
  // (e.g. Sale1194151). Retries on the rare collision.
  for (let i = 0; i < 5; i += 1) {
    const candidate = `Sale${Math.floor(1000000 + Math.random() * 9000000)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Sale.exists({ code: candidate });
    if (!exists) return candidate;
  }
  return `Sale${Date.now()}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateSaleCode() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const {
      from, to, customer, project,
    } = req.query;
    const filter = {};
    if (customer) filter.customer = customer;
    if (project) filter.project = project;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const items = await Sale.find(filter)
      .populate('customer', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('GET /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Sale.findById(req.params.id)
      .populate('customer', 'name')
      .populate('project', 'name')
      .populate('site', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.customer) return res.status(400).json({ message: 'Customer is required' });

    const code = payload.code || await generateSaleCode();
    const item = await Sale.create({
      ...payload,
      code,
      addedBy: req.user?.name || 'Admin',
    });
    const populated = await item.populate([
      { path: 'customer', select: 'name' },
      { path: 'project', select: 'name' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('customer', 'name')
      .populate('project', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error('PUT /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;