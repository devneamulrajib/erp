const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const {
  PurchaseOrder, PurchaseOrderItem, PurchaseOrderBoqItem, Project, Site,
} = require('../models/associations');

const includes = [
  { model: PurchaseOrderItem, as: 'items' },
  { model: PurchaseOrderBoqItem, as: 'boqItems' },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
];

router.get('/', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { supplierId: req.portalUser.customerId };
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }
    const orders = await PurchaseOrder.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
      include: includes,
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier acknowledges receipt of a PO — the only status transition a
// portal supplier is allowed to make from their side.
router.patch('/:id/acknowledge', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    order.status = 'Acknowledged';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;