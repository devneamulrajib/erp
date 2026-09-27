const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Workorder, WorkorderItem, ChartOfAccount, Project, Site } = require('../models/associations');

function generateCode() {
  return 'CW/' + Math.floor(1000000 + Math.random() * 9000000);
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
  const grandTotal = subtotal + vatAmount + aitAmount;
  return { subtotal, vatIncluded, vatPercent, vatAmount, aitIncluded, aitPercent, aitAmount, grandTotal };
}

const includeList = [
  { model: ChartOfAccount, as: 'customer', attributes: ['name'] },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: WorkorderItem, as: 'items' },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, customer, project } = req.query;
    const where = {};
    if (customer) where.customerId = customer;
    if (project) where.projectId = project;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }
    const orders = await Workorder.findAll({ where, include: includeList, order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Workorder.findByPk(req.params.id, {
      include: [
        { model: ChartOfAccount, as: 'customer', attributes: ['name'] },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Site, as: 'site', attributes: ['name'] },
        { model: WorkorderItem, as: 'items' },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
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

    const order = await Workorder.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      customerId: customer,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      clientOrderNo: req.body.clientOrderNo,
      attachment: req.body.attachment,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await WorkorderItem.create({ ...it, itemId: it.item, workorderId: order.id });
    }

    const populated = await Workorder.findByPk(order.id, { include: includeList });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Workorder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    const map = { customer: 'customerId', project: 'projectId', site: 'siteId' };
    const fields = ['date', 'customer', 'projectType', 'project', 'site', 'clientOrderNo', 'attachment', 'vatIncluded', 'vatPercent', 'aitIncluded', 'aitPercent'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) order[map[key] || key] = req.body[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await WorkorderItem.destroy({ where: { workorderId: order.id } });
      for (const it of items) {
        await WorkorderItem.create({ ...it, itemId: it.item, workorderId: order.id });
      }
    } else {
      items = await WorkorderItem.findAll({ where: { workorderId: order.id } });
    }

    const totals = computeTotals(req.body, items);
    Object.assign(order, totals);

    await order.save();
    const populated = await Workorder.findByPk(order.id, { include: includeList });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Workorder.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;