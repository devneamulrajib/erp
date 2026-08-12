const router = require('express').Router();
const auth = require('../middleware/auth');
const MaterialUsage = require('../models/MaterialUsage');

function generateCode() {
  return 'MU' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const rate = Number(it.rate) || 0;
    const useQty = Number(it.useQty) || 0;
    return {
      ...it,
      useQty,
      budgetQty: Number(it.budgetQty) || 0,
      purchaseQty: Number(it.purchaseQty) || 0,
      stockQty: Number(it.stockQty) || 0,
      rate,
      amount: rate * useQty,
    };
  });
}

function computeTotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, site, titleOfWork } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (site) filter.site = site;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const usages = await MaterialUsage.find(filter)
      .populate('project', 'name')
      .populate('site', 'name')
      .sort({ createdAt: -1 });

    res.json(usages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const usage = await MaterialUsage.findById(req.params.id)
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('category', 'name');
    if (!usage) return res.status(404).json({ message: 'Not found' });
    res.json(usage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, employee, creditLedger, debitLedger, projectType, project,
      titleOfWork, task, site, category, purchaseRef, items, attachment,
    } = req.body;

    if (!employee || !creditLedger || !debitLedger) {
      return res.status(400).json({ message: 'Employee, Credit Ledger and Debit Ledger are required' });
    }

    const usageItems = cleanItems(items);
    const total = computeTotal(usageItems);

    const usage = await MaterialUsage.create({
      code: code || generateCode(),
      date, employee, creditLedger, debitLedger, projectType, project,
      titleOfWork, task, site, category, purchaseRef,
      items: usageItems,
      subtotal: total,
      grandTotal: total,
      attachment,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await usage.populate([
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
    const usage = await MaterialUsage.findById(req.params.id);
    if (!usage) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'employee', 'creditLedger', 'debitLedger', 'projectType', 'project',
      'titleOfWork', 'task', 'site', 'category', 'purchaseRef', 'attachment',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) usage[key] = req.body[key];
    });

    if (req.body.items !== undefined) {
      usage.items = cleanItems(req.body.items);
      const total = computeTotal(usage.items);
      usage.subtotal = total;
      usage.grandTotal = total;
    }

    await usage.save();
    const populated = await usage.populate([
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
    const deleted = await MaterialUsage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;