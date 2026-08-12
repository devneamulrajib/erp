const router = require('express').Router();
const auth = require('../middleware/auth');
const Purchase = require('../models/Purchase');

function generateCode() {
  return 'PUR' + Math.floor(1000000 + Math.random() * 9000000);
}

function computeTotals(items, discount, deliveryCharge) {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.rate) || 0) * (Number(it.purchaseQty) || 0),
    0
  );
  const grandTotal = subtotal - (Number(discount) || 0) + (Number(deliveryCharge) || 0);
  return { subtotal, grandTotal };
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

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

// Best-effort running stock: total purchased minus total used.
// MaterialUsage lookup is optional/safe — if that model doesn't exist yet,
// stock just reflects purchases only.
router.get('/stock/:itemId', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find({ 'items.item': req.params.itemId }).lean();
    let purchased = 0;
    purchases.forEach((p) => {
      p.items.forEach((it) => {
        if (String(it.item) === req.params.itemId) purchased += Number(it.purchaseQty) || 0;
      });
    });

    let used = 0;
    try {
      const MaterialUsage = require('../models/MaterialUsage');
      const usages = await MaterialUsage.find({ 'items.item': req.params.itemId }).lean();
      usages.forEach((u) => {
        u.items.forEach((it) => {
          if (String(it.item) === req.params.itemId) used += Number(it.useQty) || 0;
        });
      });
    } catch {
      // MaterialUsage model not present — skip subtraction
    }

    res.json({ stockQty: purchased - used });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

    const purchases = await Purchase.find(filter)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('site', 'name')
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name')
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('category', 'name');
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, supplier, ledger, projectType, project, titleOfWork, task,
      site, category, reference, items, discount, deliveryCharge, paid,
      note, attachment, payments,
    } = req.body;

    if (!supplier || !ledger) {
      return res.status(400).json({ message: 'Supplier and Ledger are required' });
    }

    const purchaseItems = cleanItems(items);
    const { subtotal, grandTotal } = computeTotals(purchaseItems, discount, deliveryCharge);
    const numPaid = Number(paid) || 0;

    const purchase = await Purchase.create({
      code: code || generateCode(),
      date, supplier, ledger, projectType, project, titleOfWork, task,
      site, category, reference,
      items: purchaseItems,
      subtotal,
      discount: Number(discount) || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      grandTotal,
      paid: numPaid,
      due: grandTotal - numPaid,
      note, attachment,
      payments: Array.isArray(payments) ? payments : [],
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await purchase.populate([
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
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'supplier', 'ledger', 'projectType', 'project', 'titleOfWork', 'task',
      'site', 'category', 'reference', 'note', 'attachment', 'payments',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) purchase[key] = req.body[key];
    });

    if (req.body.items !== undefined) purchase.items = cleanItems(req.body.items);
    if (req.body.discount !== undefined) purchase.discount = Number(req.body.discount) || 0;
    if (req.body.deliveryCharge !== undefined) purchase.deliveryCharge = Number(req.body.deliveryCharge) || 0;

    const { subtotal, grandTotal } = computeTotals(purchase.items, purchase.discount, purchase.deliveryCharge);
    purchase.subtotal = subtotal;
    purchase.grandTotal = grandTotal;
    if (req.body.paid !== undefined) purchase.paid = Number(req.body.paid) || 0;
    purchase.due = purchase.grandTotal - purchase.paid;

    await purchase.save();
    const populated = await purchase.populate([
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
    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;