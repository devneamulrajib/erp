const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth } = require('../middleware/portalAuth');
const { Quote, QuoteItem, Project, Site } = require('../models/associations');

const listInclude = [
  { model: Project, as: 'project', attributes: ['name'] },
];
const detailInclude = [
  ...listInclude,
  { model: Site, as: 'site', attributes: ['name'] },
  { model: QuoteItem, as: 'items' },
];

function requireCustomer(req, res, next) {
  if (req.portalUser.role !== 'customer') {
    return res.status(403).json({ message: 'Not available for this account type' });
  }
  next();
}

router.get('/', portalAuth, requireCustomer, async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { customerId: req.portalUser.customerId };
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

router.get('/:id', portalAuth, requireCustomer, async (req, res) => {
  try {
    const quote = await Quote.findOne({
      where: { id: req.params.id, customerId: req.portalUser.customerId },
      include: detailInclude,
    });
    if (!quote) return res.status(404).json({ message: 'Not found' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer accepts or rejects a quote sent to them — the only status
// transition a portal customer is allowed to make (not admin statuses
// like 'Under Review').
router.patch('/:id/respond', portalAuth, requireCustomer, async (req, res) => {
  try {
    const { decision } = req.body; // 'Accepted' | 'Rejected'
    if (!['Accepted', 'Rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision' });
    }
    const quote = await Quote.findOne({
      where: { id: req.params.id, customerId: req.portalUser.customerId },
    });
    if (!quote) return res.status(404).json({ message: 'Not found' });
    quote.status = decision;
    await quote.save();
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;