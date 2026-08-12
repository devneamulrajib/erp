const router = require('express').Router();
const auth = require('../middleware/auth');
const ServiceRequisition = require('../models/ServiceRequisition');

function generateCode() {
  return 'SR' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
    qtyDays: Number(it.qtyDays) || 0,
    rate: Number(it.rate) || 0,
    amount: (Number(it.rate) || 0) * (Number(it.qtyDays) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

const populateFields = [
  { path: 'project', select: 'name' },
  { path: 'site', select: 'name' },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, titleOfWork } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const requisitions = await ServiceRequisition.find(filter)
      .populate(populateFields)
      .sort({ createdAt: -1 });

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await ServiceRequisition.findById(req.params.id).populate(populateFields);
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, projectType, project, titleOfWork, task, site,
      items, attachment,
    } = req.body;

    const reqItems = cleanItems(items);
    const subtotal = computeSubtotal(reqItems);

    const requisition = await ServiceRequisition.create({
      code: code || generateCode(),
      date, projectType, project, titleOfWork, task, site,
      items: reqItems,
      subtotal,
      grandTotal: subtotal,
      attachment,
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
    const requisition = await ServiceRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const fields = ['date', 'projectType', 'project', 'titleOfWork', 'task', 'site', 'attachment'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key];
    });

    if (req.body.items !== undefined) {
      requisition.items = cleanItems(req.body.items);
      requisition.subtotal = computeSubtotal(requisition.items);
      requisition.grandTotal = requisition.subtotal;
    }

    await requisition.save();
    const populated = await requisition.populate(populateFields);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ServiceRequisition.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;