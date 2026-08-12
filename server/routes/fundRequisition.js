const router = require('express').Router();
const auth = require('../middleware/auth');
const FundRequisition = require('../models/FundRequisition');

function generateReference() {
  return 'REQ-' + Math.floor(100 + Math.random() * 900);
}

const populateFields = [
  { path: 'project', select: 'name' },
  { path: 'site', select: 'name' },
  { path: 'from', select: 'name code' },
];

router.get('/', auth, async (req, res) => {
  try {
    const { from, approveStatus } = req.query;
    const filter = {};
    if (from) filter.from = from;

    let requisitions = await FundRequisition.find(filter)
      .populate(populateFields)
      .sort({ createdAt: -1 });

    if (approveStatus === 'Approved') {
      requisitions = requisitions.filter((r) => r.approvals.length > 0 && r.approvals.every((a) => a.approved));
    } else if (approveStatus === 'Pending Approval') {
      requisitions = requisitions.filter((r) => r.approvals.length === 0 || r.approvals.some((a) => !a.approved));
    }

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findById(req.params.id).populate(populateFields);
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      date, projectType, project, task, subTask, site, from,
      amount, purpose, reference,
    } = req.body;

    if (!date || !amount || !purpose) {
      return res.status(400).json({ message: 'Date, Amount and Purpose are required' });
    }

    const requisition = await FundRequisition.create({
      date, projectType, project, task, subTask, site, from,
      amount: Number(amount) || 0,
      approvedAmount: 0,
      paidAmount: 0,
      purpose,
      reference: reference || generateReference(),
      paymentStatus: 'Payment Left',
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await requisition.populate(populateFields);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'projectType', 'project', 'task', 'subTask', 'site', 'from',
      'purpose', 'reference', 'approvedAmount', 'paymentStatus',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key];
    });
    if (req.body.amount !== undefined) requisition.amount = Number(req.body.amount) || 0;

    await requisition.save();
    const populated = await requisition.populate(populateFields);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a payment entry, bump paidAmount, optionally flip status to Done
router.post('/:id/payments', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const { method, amount, date, markDone } = req.body;
    const amt = Number(amount) || 0;

    requisition.payments.push({
      transactionId: 'TXN' + Math.floor(100000 + Math.random() * 900000),
      method: method || 'Cash',
      amount: amt,
      date: date || new Date().toISOString().slice(0, 10),
    });
    requisition.paidAmount += amt;
    if (markDone) requisition.paymentStatus = 'Done';

    await requisition.save();
    const populated = await requisition.populate(populateFields);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await FundRequisition.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;