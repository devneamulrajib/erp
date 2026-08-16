const router = require('express').Router();
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const {
  PurchaseOrder, PurchaseOrderItem, PurchaseOrderBoqItem, PurchaseOrderApproval,
  Customer, Project, Site,
} = require('../models/associations');

function generateCode() {
  return 'PO-' + Math.floor(100000 + Math.random() * 900000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    itemId: it.item || it.itemId || null,
    itemCode: it.itemCode,
    itemName: it.itemName,
    details: it.details,
    unit: it.unit,
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    budgetQty: Number(it.budgetQty) || 0,
    purchaseQty: Number(it.purchaseQty) || 0,
    stockQty: Number(it.stockQty) || 0,
    amount: (Number(it.rate) || 0) * (Number(it.purchaseQty) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

const includes = [
  { model: PurchaseOrderItem, as: 'items' },
  { model: PurchaseOrderBoqItem, as: 'boqItems' },
  { model: PurchaseOrderApproval, as: 'approvals' },
  { model: Customer, as: 'supplier', attributes: ['id', 'name'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: Site, as: 'site', attributes: ['id', 'name'] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, supplier, project, titleOfWork } = req.query;
    const where = {};
    if (supplier) where.supplierId = supplier;
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const orders = await PurchaseOrder.findAll({
      where,
      include: includes,
      order: [['createdAt', 'DESC']],
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, { include: includes });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      code, date, supplier, projectType, project, titleOfWork, task,
      site, category, reference, boqItems, items, attachment,
    } = req.body;

    if (!supplier) {
      await t.rollback();
      return res.status(400).json({ message: 'Supplier is required' });
    }

    const orderItems = cleanItems(items);
    const subtotal = computeSubtotal(orderItems);

    const order = await PurchaseOrder.create({
      code: code || generateCode(),
      date, supplierId: supplier, projectType, projectId: project || null,
      titleOfWork, task, siteId: site || null, categoryId: category || null, reference,
      subtotal,
      grandTotal: subtotal,
      attachment,
      addedBy: req.user?.name || 'Admin',
    }, { transaction: t });

    if (orderItems.length) {
      await PurchaseOrderItem.bulkCreate(
        orderItems.map((it) => ({ ...it, purchaseOrderId: order.id })),
        { transaction: t },
      );
    }

    const boqRows = (Array.isArray(boqItems) ? boqItems : []).map((label) => ({
      purchaseOrderId: order.id,
      label,
    }));
    if (boqRows.length) await PurchaseOrderBoqItem.bulkCreate(boqRows, { transaction: t });

    await PurchaseOrderApproval.create(
      { purchaseOrderId: order.id, name: 'Admin', approved: false },
      { transaction: t },
    );

    await t.commit();

    const populated = await PurchaseOrder.findByPk(order.id, { include: includes });
    res.status(201).json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }

    const fieldMap = {
      date: 'date', titleOfWork: 'titleOfWork', task: 'task', reference: 'reference',
      projectType: 'projectType', attachment: 'attachment',
      supplier: 'supplierId', project: 'projectId', site: 'siteId', category: 'categoryId',
    };
    Object.entries(fieldMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) order[col] = req.body[bodyKey];
    });

    if (req.body.items !== undefined) {
      const orderItems = cleanItems(req.body.items);
      order.subtotal = computeSubtotal(orderItems);
      order.grandTotal = order.subtotal;
      await PurchaseOrderItem.destroy({ where: { purchaseOrderId: order.id }, transaction: t });
      if (orderItems.length) {
        await PurchaseOrderItem.bulkCreate(
          orderItems.map((it) => ({ ...it, purchaseOrderId: order.id })),
          { transaction: t },
        );
      }
    }

    if (req.body.boqItems !== undefined) {
      await PurchaseOrderBoqItem.destroy({ where: { purchaseOrderId: order.id }, transaction: t });
      const boqRows = (Array.isArray(req.body.boqItems) ? req.body.boqItems : [])
        .map((label) => ({ purchaseOrderId: order.id, label }));
      if (boqRows.length) await PurchaseOrderBoqItem.bulkCreate(boqRows, { transaction: t });
    }

    await order.save({ transaction: t });
    await t.commit();

    const populated = await PurchaseOrder.findByPk(order.id, { include: includes });
    res.json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await PurchaseOrder.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;