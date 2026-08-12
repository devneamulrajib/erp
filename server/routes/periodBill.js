const router = require('express').Router();
const auth = require('../middleware/auth');
const PeriodBill = require('../models/PeriodBill');

function generateCode() {
  return 'PB' + Math.floor(1000000 + Math.random() * 9000000);
}

function computeTotals(body) {
  const projectCost = Number(body.projectCost) || 0;
  const percentage = Number(body.percentage) || 0;
  const constructionCost = projectCost * (percentage / 100);
  const serviceCharge = Number(body.serviceCharge) || 0;
  const grandTotal = constructionCost + serviceCharge;

  return { projectCost, percentage, constructionCost, serviceCharge, grandTotal };
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

    const bills = await PeriodBill.find(filter)
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
    const bill = await PeriodBill.findById(req.params.id)
      .populate('customer', 'name')
      .populate('ledger', 'name code')
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

    const totals = computeTotals(req.body);

    const bill = await PeriodBill.create({
      ...req.body,
      code: req.body.code || generateCode(),
      ...totals,
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
    const bill = await PeriodBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'customer', 'ledger', 'site', 'refWoNo',
      'startDate', 'endDate', 'project', 'attachment', 'contentBody',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) bill[key] = req.body[key];
    });

    const totals = computeTotals({ ...bill.toObject(), ...req.body });
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
    const deleted = await PeriodBill.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;