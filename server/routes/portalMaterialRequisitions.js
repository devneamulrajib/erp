const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const {
  MaterialRequisition, MaterialRequisitionItem, Project, Site,
} = require('../models/associations');

const includes = [
  { model: MaterialRequisitionItem, as: 'items' },
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
    const reqs = await MaterialRequisition.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
    res.json(reqs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const item = await MaterialRequisition.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
      include: includes,
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;