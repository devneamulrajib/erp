const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  ServiceRequisition, ServiceRequisitionItem, ServiceRequisitionApproval, Project, Site,
} = require('../models/associations');

function generateCode() {
  return 'SR' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    serviceItemId: it.serviceItem || it.serviceItemId || null,
    boqItem: it.boqItem,
    date: it.date,
    code: it.code,
    name: it.name,
    unit: it.unit,
    qtyDays: Number(it.qtyDays) || 0,
    rate: Number(it.rate) || 0,
    details: it.details,
    amount: (Number(it.rate) || 0) * (Number(it.qtyDays) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

const listInclude = [
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
];

const detailInclude = [
  ...listInclude,
  { model: ServiceRequisitionItem, as: 'items' },
  { model: ServiceRequisitionApproval, as: 'approvals' },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, titleOfWork } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const requisitions = await ServiceRequisition.findAll({
      where,
      include: listInclude,
      order: [['createdAt', 'DESC']],
    });

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await ServiceRequisition.findByPk(req.params.id, { include: detailInclude });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, projectType, project, titleOfWork, task, site, items, attachment,
    } = req.body;

    const reqItems = cleanItems(items);
    const subtotal = computeSubtotal(reqItems);

    const requisition = await ServiceRequisition.create({
      code: code || generateCode(),
      date,
      projectType,
      projectId: project || null,
      titleOfWork,
      task,
      siteId: site || null,
      subtotal,
      grandTotal: subtotal,
      attachment,
      addedBy: req.user?.name || 'Admin',
    });

    if (reqItems.length) {
      await ServiceRequisitionItem.bulkCreate(
        reqItems.map((it) => ({ ...it, serviceRequisitionId: requisition.id })),
      );
    }
    await ServiceRequisitionApproval.create({
      name: 'Admin', approved: false, serviceRequisitionId: requisition.id,
    });

    const populated = await ServiceRequisition.findByPk(requisition.id, { include: detailInclude });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await ServiceRequisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const fkMap = { project: 'projectId', site: 'siteId' };
    const fields = ['date', 'projectType', 'titleOfWork', 'task', 'attachment'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key];
    });
    Object.entries(fkMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) requisition[col] = req.body[bodyKey];
    });

    if (req.body.items !== undefined) {
      const items = cleanItems(req.body.items);
      const subtotal = computeSubtotal(items);
      requisition.subtotal = subtotal;
      requisition.grandTotal = subtotal;

      await ServiceRequisitionItem.destroy({ where: { serviceRequisitionId: requisition.id } });
      if (items.length) {
        await ServiceRequisitionItem.bulkCreate(
          items.map((it) => ({ ...it, serviceRequisitionId: requisition.id })),
        );
      }
    }

    await requisition.save();
    const populated = await ServiceRequisition.findByPk(requisition.id, { include: detailInclude });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ServiceRequisition.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;