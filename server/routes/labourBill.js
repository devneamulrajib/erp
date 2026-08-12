const router = require('express').Router();
const auth = require('../middleware/auth');
const LabourBill = require('../models/LabourBill');

function generateCode() {
  return 'L/WB' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qtyDays = Number(it.qtyDays) || 0;
    const rate = Number(it.rate) || 0;
    const security = Number(it.security) || 0;
    const gross = qtyDays * rate;
    return { ...it, qtyDays, rate, security, gross, netPayable: gross - security };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.gross) || 0), 0);
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.qtyDays) || 0), 0);
  const totalSecurity = items.reduce((sum, it) => sum + (Number(it.security) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const grandTotal = subtotal + vatAmount;
  const totalPayable = grandTotal - totalSecurity;

  const paid = Number(body.paid) || 0;
  const due = totalPayable - paid;

  return {
    subtotal, totalQuantity, vatIncluded, vatPercent, vatAmount,
    grandTotal, totalSecurity, totalPayable, paid, due,
  };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, party, ledger, project, titleOfWork } = req.query;
    const filter = {};
    if (party) filter.party = party;
    if (ledger) filter.ledger = ledger;
    if (project) filter.project = project;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const bills = await LabourBill.find(filter)
      .populate('party', 'name')
      .populate('ledger', 'name code')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findById(req.params.id)
      .populate('party', 'name')
      .populate('ledger', 'name code')
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('category', 'name');
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { party } = req.body;
    if (!party) return res.status(400).json({ message: 'Contractor is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const bill = await LabourBill.create({
      ...req.body,
      code: req.body.code || generateCode(),
      items,
      ...totals,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await bill.populate([
      { path: 'party', select: 'name' },
      { path: 'ledger', select: 'name code' },
      { path: 'project', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'party', 'ledger', 'creditLedgerLabel', 'projectType', 'project',
      'titleOfWork', 'task', 'site', 'category', 'refWoNo', 'attachment',
      'vatIncluded', 'vatPercent', 'paymentMethod', 'paid',
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
      { path: 'party', select: 'name' },
      { path: 'ledger', select: 'name code' },
      { path: 'project', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await LabourBill.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;