const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Quote, QuoteItem, Customer, Project, Site,
} = require('../models/associations');

function generateCode() {
  return 'Quo' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return {
      itemName: it.itemName,
      unit: it.unit,
      quantity,
      rate,
      details: it.details,
      image: it.image,
      amount: quantity * rate,
    };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = subtotal * (vatPercent / 100);

  const deliveryCharge = Number(body.deliveryCharge) || 0;

  const discountPercent = Number(body.discountPercent) || 0;
  const discountAmount = subtotal * (discountPercent / 100);

  const grandTotal = subtotal + vatAmount + deliveryCharge - discountAmount;

  return { subtotal, vatPercent, vatAmount, deliveryCharge, discountPercent, discountAmount, grandTotal };
}

const listInclude = [
  { model: Customer, as: 'customer', attributes: ['name'] },
  { model: Project, as: 'project', attributes: ['name'] },
];

const detailInclude = [
  ...listInclude,
  { model: Site, as: 'site', attributes: ['name'] },
  { model: QuoteItem, as: 'items' },
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

    const quotes = await Quote.findAll({ where, include: listInclude, order: [['createdAt', 'DESC']] });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id, { include: detailInclude });
    if (!quote) return res.status(404).json({ message: 'Not found' });
    res.json(quote);
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

    const quote = await Quote.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      customerId: customer,
      projectType: req.body.projectType,
      projectId: req.body.project || null,
      siteId: req.body.site || null,
      attachment: req.body.attachment,
      contentBody: req.body.contentBody,
      contentFooter: req.body.contentFooter,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    if (items.length) {
      await QuoteItem.bulkCreate(items.map((it) => ({ ...it, quoteId: quote.id })));
    }

    const populated = await Quote.findByPk(quote.id, { include: listInclude });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id, { include: [{ model: QuoteItem, as: 'items' }] });
    if (!quote) return res.status(404).json({ message: 'Not found' });

    const fkMap = { customer: 'customerId', project: 'projectId', site: 'siteId' };
    const fields = ['date', 'projectType', 'attachment', 'contentBody', 'contentFooter', 'vatPercent', 'deliveryCharge', 'discountPercent'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) quote[key] = req.body[key];
    });
    Object.entries(fkMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) quote[col] = req.body[bodyKey];
    });

    let items = (quote.items || []).map((it) => it.toJSON());
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await QuoteItem.destroy({ where: { quoteId: quote.id } });
      if (items.length) {
        await QuoteItem.bulkCreate(items.map((it) => ({ ...it, quoteId: quote.id })));
      }
    }

    const totals = computeTotals({ ...quote.toJSON(), ...req.body }, items);
    Object.assign(quote, totals);

    await quote.save();
    const populated = await Quote.findByPk(quote.id, { include: listInclude });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Quote.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Submitted', 'Under Review', 'Sent', 'Accepted', 'Rejected', 'Expired'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Not found' });
    quote.status = status;
    await quote.save();
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;