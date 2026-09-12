const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth } = require('../middleware/portalAuth');
const { Bill, BillLineItem, BillPayment, Project } = require('../models/associations');
const { buildBillPdf } = require('../utils/billPdf');

const includeAll = [
  { model: Project, attributes: ['name'] },
  { model: BillLineItem },
  { model: BillPayment },
];

// Only customers see bills — supplier/vendor bills aren't modeled yet (see Phase 1 notes).
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
    const bills = await Bill.findAll({ where, include: includeAll, order: [['createdAt', 'DESC']] });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, requireCustomer, async (req, res) => {
  try {
    const bill = await Bill.findOne({
      where: { id: req.params.id, customerId: req.portalUser.customerId },
      include: includeAll,
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/pdf', portalAuth, requireCustomer, async (req, res) => {
  try {
    const bill = await Bill.findOne({
      where: { id: req.params.id, customerId: req.portalUser.customerId },
      include: includeAll,
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${bill.code}.pdf"`);
    buildBillPdf(bill, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;