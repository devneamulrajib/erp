const router = require('express').Router();
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const {
  StockTransfer, StockTransferItem, Project, Site,
} = require('../models/associations');

function generateCode() {
  return 'STA' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    itemId: it.item || it.itemId || null,
    itemCode: it.itemCode,
    itemName: it.itemName,
    unit: it.unit,
    quantity: Number(it.quantity) || 0,
    availableQty: Number(it.availableQty) || 0,
    details: it.details,
  }));
}

const includes = [
  { model: StockTransferItem, as: 'items' },
  { model: Project, as: 'fromProject', attributes: ['id', 'name'] },
  { model: Site, as: 'fromSite', attributes: ['id', 'name'] },
  { model: Project, as: 'toProject', attributes: ['id', 'name'] },
  { model: Site, as: 'toSite', attributes: ['id', 'name'] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, fromProject, toProject, fromTask } = req.query;
    const where = {};
    if (fromProject) where.fromProjectId = fromProject;
    if (toProject) where.toProjectId = toProject;
    if (fromTask) where.fromTask = fromTask;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const transfers = await StockTransfer.findAll({
      where,
      include: includes,
      order: [['createdAt', 'DESC']],
    });

    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, { include: includes });
    if (!transfer) return res.status(404).json({ message: 'Not found' });
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      code, date, employee, fromProjectType, fromProject, fromSite, fromTask,
      category, items, toProjectType, toProject, toSite, toTask, toSubTask, contact,
    } = req.body;

    if (!fromProject || !toProject) {
      await t.rollback();
      return res.status(400).json({ message: 'From Project and To Project are required' });
    }

    const transfer = await StockTransfer.create({
      code: code || generateCode(),
      date, employee, fromProjectType, fromProjectId: fromProject, fromSiteId: fromSite || null, fromTask,
      categoryId: category || null,
      toProjectType, toProjectId: toProject, toSiteId: toSite || null, toTask, toSubTask, contact,
      addedBy: req.user?.name || 'Admin',
    }, { transaction: t });

    const transferItems = cleanItems(items);
    if (transferItems.length) {
      await StockTransferItem.bulkCreate(
        transferItems.map((it) => ({ ...it, stockTransferId: transfer.id })),
        { transaction: t },
      );
    }

    await t.commit();
    const populated = await StockTransfer.findByPk(transfer.id, { include: includes });
    res.status(201).json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }

    const fieldMap = {
      date: 'date', employee: 'employee', fromProjectType: 'fromProjectType', fromTask: 'fromTask',
      toProjectType: 'toProjectType', toTask: 'toTask', toSubTask: 'toSubTask', contact: 'contact',
      fromProject: 'fromProjectId', fromSite: 'fromSiteId', category: 'categoryId',
      toProject: 'toProjectId', toSite: 'toSiteId',
    };
    Object.entries(fieldMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) transfer[col] = req.body[bodyKey];
    });

    if (req.body.items !== undefined) {
      const transferItems = cleanItems(req.body.items);
      await StockTransferItem.destroy({ where: { stockTransferId: transfer.id }, transaction: t });
      if (transferItems.length) {
        await StockTransferItem.bulkCreate(
          transferItems.map((it) => ({ ...it, stockTransferId: transfer.id })),
          { transaction: t },
        );
      }
    }

    await transfer.save({ transaction: t });
    await t.commit();

    const populated = await StockTransfer.findByPk(transfer.id, { include: includes });
    res.json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await StockTransfer.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;