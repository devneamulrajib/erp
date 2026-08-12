const router = require('express').Router();
const auth = require('../middleware/auth');
const Quote = require('../models/Quote');

function generateCode() {
  return 'Quo' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return { ...it, quantity, rate, amount: quantity * rate };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = subtotal * (vatPercent / 100);

  const deliveryCharge = Number(body.deliveryCharge) || 0;

  const discountPercent = Number(body.discountPercent) || 0;
  const discountAmount = subtotal * (discountPercent / 100);

  const grandTotal = subtotal + vatAmount + deliveryCharge - discountAmount;

  return { subtotal, vatPercent, vatAmount, deliveryCharge, discountPercent, discountAmount, grandTotal };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, customer, project } = req.query;
    const filter = {};
    if (customer) filter.customer = customer;
    if (project) filter.project = project;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const quotes = await Quote.find(filter)
      .populate('customer', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('customer', 'name')
      .populate('project', 'name')
      .populate('site', 'name');
    if (!quote) return res.status(404).json({ message: 'Not found' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customer } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const quote = await Quote.create({
      ...req.body,
      code: req.body.code || generateCode(),
      items,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await quote.populate([
      { path: 'customer', select: 'name' },
      { path: 'project', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Not found' });

    const fields = ['date', 'customer', 'projectType', 'project', 'site', 'attachment', 'contentBody', 'contentFooter', 'vatPercent', 'deliveryCharge', 'discountPercent'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) quote[key] = req.body[key];
    });

    const items = req.body.items !== undefined ? cleanItems(req.body.items) : quote.items;
    if (req.body.items !== undefined) quote.items = items;

    const totals = computeTotals({ ...quote.toObject(), ...req.body }, items);
    Object.assign(quote, totals);

    await quote.save();
    const populated = await quote.populate([
      { path: 'customer', select: 'name' },
      { path: 'project', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Quote.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;