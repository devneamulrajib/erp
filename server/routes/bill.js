const router = require('express').Router();
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');

function generateCode() {
  return 'Bill' + Math.floor(1000000 + Math.random() * 9000000);
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

  const interestRate = Number(body.interestRate) || 0;
  const interestAmount = subtotal * (interestRate / 100);

  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;

  const payments = Array.isArray(body.payments) ? body.payments : [];
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const due = grandTotal - paid;

  return {
    subtotal, vatIncluded, vatPercent, vatAmount,
    aitIncluded, aitPercent, aitAmount,
    interestRate, interestAmount, grandTotal, paid, due,
  };
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

    const bills = await Bill.find(filter)
      .populate('customer', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer', 'name')
      .populate('ledger', 'name')
      .populate('project', 'name')
      .populate('site', 'name');
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
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

    const bill = await Bill.create({
      ...req.body,
      code: req.body.code || generateCode(),
      items,
      ...totals,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await bill.populate([
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
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'customer', 'ledger', 'projectType', 'project', 'site',
      'refWoNo', 'contentBody', 'attachment', 'payments',
      'vatIncluded', 'vatPercent', 'aitIncluded', 'aitPercent', 'interestRate',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) bill[key] = req.body[key];
    });

    const items = req.body.items !== undefined ? cleanItems(req.body.items) : bill.items;
    if (req.body.items !== undefined) bill.items = items;

    const totals = computeTotals({ ...bill.toObject(), ...req.body }, items);
    Object.assign(bill, totals);

    await bill.save();
    const populated = await bill.populate([
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
    const deleted = await Bill.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;