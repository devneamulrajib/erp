const router = require('express').Router();
const auth = require('../middleware/auth');
const StockTransfer = require('../models/StockTransfer');

function generateCode() {
  return 'STA' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
    quantity: Number(it.quantity) || 0,
    availableQty: Number(it.availableQty) || 0,
  }));
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, fromProject, toProject, fromTask } = req.query;
    const filter = {};
    if (fromProject) filter.fromProject = fromProject;
    if (toProject) filter.toProject = toProject;
    if (fromTask) filter.fromTask = fromTask;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const transfers = await StockTransfer.find(filter)
      .populate('fromProject', 'name')
      .populate('fromSite', 'name')
      .populate('toProject', 'name')
      .populate('toSite', 'name')
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('fromProject', 'name')
      .populate('fromSite', 'name')
      .populate('toProject', 'name')
      .populate('toSite', 'name');
    if (!transfer) return res.status(404).json({ message: 'Not found' });
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, employee, fromProjectType, fromProject, fromSite, fromTask,
      category, items, toProjectType, toProject, toSite, toTask, toSubTask, contact,
    } = req.body;

    if (!fromProject || !toProject) {
      return res.status(400).json({ message: 'From Project and To Project are required' });
    }

    const transfer = await StockTransfer.create({
      code: code || generateCode(),
      date, employee, fromProjectType, fromProject, fromSite, fromTask,
      category, items: cleanItems(items),
      toProjectType, toProject, toSite, toTask, toSubTask, contact,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await transfer.populate([
      { path: 'fromProject', select: 'name' },
      { path: 'fromSite', select: 'name' },
      { path: 'toProject', select: 'name' },
      { path: 'toSite', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'employee', 'fromProjectType', 'fromProject', 'fromSite', 'fromTask',
      'category', 'toProjectType', 'toProject', 'toSite', 'toTask', 'toSubTask', 'contact',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) transfer[key] = req.body[key];
    });
    if (req.body.items !== undefined) transfer.items = cleanItems(req.body.items);

    await transfer.save();
    const populated = await transfer.populate([
      { path: 'fromProject', select: 'name' },
      { path: 'fromSite', select: 'name' },
      { path: 'toProject', select: 'name' },
      { path: 'toSite', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await StockTransfer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;