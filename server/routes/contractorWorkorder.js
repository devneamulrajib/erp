const router = require('express').Router();
const auth = require('../middleware/auth');
const ContractorWorkorder = require('../models/ContractorWorkorder');

function generateCode() {
  return 'W/O' + Math.floor(1000000 + Math.random() * 9000000);
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

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const aitIncluded = !!body.aitIncluded;
  const aitPercent = Number(body.aitPercent) || 0;
  const aitAmount = aitIncluded ? subtotal * (aitPercent / 100) : 0;

  const discount = Number(body.discount) || 0;
  const grandTotal = subtotal + vatAmount + aitAmount - discount;

  return { subtotal, vatIncluded, vatPercent, vatAmount, aitIncluded, aitPercent, aitAmount, discount, grandTotal };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, supplier, project } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (project) filter.project = project;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const orders = await ContractorWorkorder.find(filter)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await ContractorWorkorder.findById(req.params.id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('category', 'name');
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { supplier } = req.body;
    if (!supplier) return res.status(400).json({ message: 'Supplier is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const order = await ContractorWorkorder.create({
      ...req.body,
      code: req.body.code || generateCode(),
      items,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await order.populate([
      { path: 'supplier', select: 'name' },
      { path: 'project', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await ContractorWorkorder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'supplier', 'projectType', 'project', 'site', 'category',
      'refInvoiceNo', 'contentBody', 'attachment',
      'vatIncluded', 'vatPercent', 'aitIncluded', 'aitPercent', 'discount',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) order[key] = req.body[key];
    });

    const items = req.body.items !== undefined ? cleanItems(req.body.items) : order.items;
    if (req.body.items !== undefined) order.items = items;

    const totals = computeTotals({ ...order.toObject(), ...req.body }, items);
    Object.assign(order, totals);

    await order.save();
    const populated = await order.populate([
      { path: 'supplier', select: 'name' },
      { path: 'project', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContractorWorkorder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;