const router = require('express').Router();
const auth = require('../middleware/auth');
const PurchaseOrder = require('../models/PurchaseOrder');

function generateCode() {
  return 'PO-' + Math.floor(100000 + Math.random() * 900000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    budgetQty: Number(it.budgetQty) || 0,
    purchaseQty: Number(it.purchaseQty) || 0,
    stockQty: Number(it.stockQty) || 0,
    amount: (Number(it.rate) || 0) * (Number(it.purchaseQty) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, supplier, project, titleOfWork } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (project) filter.project = project;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('site', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('site', 'name');
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, supplier, projectType, project, titleOfWork, task,
      site, category, reference, boqItems, items, attachment,
    } = req.body;

    if (!supplier) {
      return res.status(400).json({ message: 'Supplier is required' });
    }

    const orderItems = cleanItems(items);
    const subtotal = computeSubtotal(orderItems);

    const order = await PurchaseOrder.create({
      code: code || generateCode(),
      date, supplier, projectType, project, titleOfWork, task,
      site, category, reference,
      boqItems: Array.isArray(boqItems) ? boqItems : [],
      items: orderItems,
      subtotal,
      grandTotal: subtotal,
      attachment,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await order.populate([
      { path: 'supplier', select: 'name' },
      { path: 'project', select: 'name' },
      { path: 'site', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'supplier', 'projectType', 'project', 'titleOfWork', 'task',
      'site', 'category', 'reference', 'boqItems', 'attachment',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) order[key] = req.body[key];
    });

    if (req.body.items !== undefined) {
      order.items = cleanItems(req.body.items);
      order.subtotal = computeSubtotal(order.items);
      order.grandTotal = order.subtotal;
    }

    await order.save();
    const populated = await order.populate([
      { path: 'supplier', select: 'name' },
      { path: 'project', select: 'name' },
      { path: 'site', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;