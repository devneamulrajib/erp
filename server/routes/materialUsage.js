const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { MaterialUsage, MaterialUsageItem, MaterialUsageApproval, Project, Site } = require('../models/associations');

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

const includeAll = [
  { model: MaterialUsageItem },
  { model: MaterialUsageApproval },
  { model: Project, attributes: ['name'] },
  { model: Site, attributes: ['name'] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, site, titleOfWork } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (site) where.siteId = site;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const usages = await MaterialUsage.findAll({
      where,
      include: [
        { model: MaterialUsageItem },
        { model: Project, attributes: ['name'] },
        { model: Site, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(usages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const usage = await MaterialUsage.findByPk(req.params.id, { include: includeAll });
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
      date, employee, creditLedger, debitLedger, projectType,
      projectId: project,
      titleOfWork, task,
      siteId: site,
      categoryId: category,
      purchaseRef,
      subtotal: total,
      grandTotal: total,
      attachment,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of usageItems) {
      await MaterialUsageItem.create({ ...it, itemId: it.item, materialUsageId: usage.id });
    }
    await MaterialUsageApproval.create({ name: 'Admin', approved: false, materialUsageId: usage.id });

    const populated = await MaterialUsage.findByPk(usage.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const usage = await MaterialUsage.findByPk(req.params.id);
    if (!usage) return res.status(404).json({ message: 'Not found' });

    const fields = ['date', 'employee', 'creditLedger', 'debitLedger', 'projectType', 'titleOfWork', 'task', 'purchaseRef', 'attachment'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) usage[key] = req.body[key];
    });
    if (req.body.project !== undefined) usage.projectId = req.body.project;
    if (req.body.site !== undefined) usage.siteId = req.body.site;
    if (req.body.category !== undefined) usage.categoryId = req.body.category;

    if (req.body.items !== undefined) {
      const items = cleanItems(req.body.items);
      await MaterialUsageItem.destroy({ where: { materialUsageId: usage.id } });
      for (const it of items) {
        await MaterialUsageItem.create({ ...it, itemId: it.item, materialUsageId: usage.id });
      }
      const total = computeTotal(items);
      usage.subtotal = total;
      usage.grandTotal = total;
    }

    await usage.save();
    const populated = await MaterialUsage.findByPk(usage.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await MaterialUsage.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;