const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  MaterialRequisition, MaterialRequisitionItem, MaterialRequisitionApproval,
  Customer, Project, Site, Category,
  // NOTE: Purchase/PurchaseItem are assumed already converted (Purchase wasn't
  // in your pending list). PurchaseOrder/PurchaseOrderItem are still pending
  // in this batch (Tier 3) — the convert-to-purchase-order route below will
  // throw until PurchaseOrder + PurchaseOrderItem exist in associations.js.
  // Double-check these four names/fields once each is confirmed.
  Purchase, PurchaseItem, PurchaseOrder, PurchaseOrderItem,
} = require('../models/associations');

function generateCode() {
  return 'REQ-' + Math.floor(100 + Math.random() * 900);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    itemId: it.item || it.itemId || null,
    itemCode: it.itemCode,
    itemName: it.itemName,
    details: it.details,
    unit: it.unit,
    budgetQty: Number(it.budgetQty) || 0,
    demandQty: Number(it.demandQty) || 0,
    stockQty: Number(it.stockQty) || 0,
    rate: Number(it.rate) || 0,
    amount: (Number(it.rate) || 0) * (Number(it.demandQty) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

const listInclude = [
  { model: Customer, as: 'supplier', attributes: ['name'] },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
];

const detailInclude = [
  ...listInclude,
  { model: MaterialRequisitionItem, as: 'items' },
  { model: MaterialRequisitionApproval, as: 'approvals' },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, company, supplier, project, titleOfWork } = req.query;
    const where = {};
    if (company) where.company = company;
    if (supplier) where.supplierId = supplier;
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const requisitions = await MaterialRequisition.findAll({
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
    const requisition = await MaterialRequisition.findByPk(req.params.id, { include: detailInclude });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, demandDate, company, supplier, projectType, project,
      titleOfWork, task, site, category, reference, items, attachment, note,
    } = req.body;

    const reqItems = cleanItems(items);
    const subtotal = computeSubtotal(reqItems);

    const requisition = await MaterialRequisition.create({
      code: code || generateCode(),
      date,
      demandDate,
      company,
      supplierId: supplier || null,
      projectType,
      projectId: project || null,
      titleOfWork,
      task,
      siteId: site || null,
      categoryId: category || null,
      reference,
      subtotal,
      attachment,
      note,
      addedBy: req.user?.name || 'Admin',
    });

    if (reqItems.length) {
      await MaterialRequisitionItem.bulkCreate(
        reqItems.map((it) => ({ ...it, materialRequisitionId: requisition.id })),
      );
    }
    await MaterialRequisitionApproval.create({
      name: 'Admin', approved: false, materialRequisitionId: requisition.id,
    });

    const populated = await MaterialRequisition.findByPk(requisition.id, { include: detailInclude });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const fkMap = {
      supplier: 'supplierId', project: 'projectId', site: 'siteId', category: 'categoryId',
    };
    const fields = [
      'date', 'demandDate', 'company', 'projectType', 'titleOfWork', 'task', 'reference', 'attachment', 'note',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key];
    });
    Object.entries(fkMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) requisition[col] = req.body[bodyKey];
    });

    if (req.body.items !== undefined) {
      const items = cleanItems(req.body.items);
      requisition.subtotal = computeSubtotal(items);

      await MaterialRequisitionItem.destroy({ where: { materialRequisitionId: requisition.id } });
      if (items.length) {
        await MaterialRequisitionItem.bulkCreate(
          items.map((it) => ({ ...it, materialRequisitionId: requisition.id })),
        );
      }
    }

    await requisition.save();
    const populated = await MaterialRequisition.findByPk(requisition.id, { include: detailInclude });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await MaterialRequisition.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Convert requisition items -> a real Purchase record
router.post('/:id/convert-to-purchase', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findByPk(req.params.id, {
      include: [{ model: MaterialRequisitionItem, as: 'items' }],
    });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    if (!requisition.supplierId) {
      return res.status(400).json({ message: 'Requisition needs a supplier before converting to a Purchase' });
    }

    const items = requisition.items.map((it) => ({
      itemId: it.itemId,
      itemCode: it.itemCode,
      itemName: it.itemName,
      details: it.details,
      unit: it.unit,
      budgetQty: it.budgetQty,
      purchaseQty: it.demandQty,
      stockQty: it.stockQty,
      rate: it.rate,
      amount: it.rate * it.demandQty,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

    const purchase = await Purchase.create({
      code: 'PUR' + Math.floor(1000000 + Math.random() * 9000000),
      date: new Date().toISOString().slice(0, 10),
      supplierId: requisition.supplierId,
      ledger: 'Closing Stock',
      projectType: requisition.projectType,
      projectId: requisition.projectId,
      titleOfWork: requisition.titleOfWork,
      task: requisition.task,
      siteId: requisition.siteId,
      categoryId: requisition.categoryId,
      reference: requisition.code,
      subtotal,
      grandTotal: subtotal,
      paid: 0,
      due: subtotal,
      addedBy: req.user?.name || 'Admin',
    });

    if (items.length && PurchaseItem) {
      await PurchaseItem.bulkCreate(items.map((it) => ({ ...it, purchaseId: purchase.id })));
    }

    requisition.status = 'Converted';
    requisition.convertedToPurchaseId = purchase.id;
    await requisition.save();

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Convert requisition items -> a real Purchase Order record
router.post('/:id/convert-to-purchase-order', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findByPk(req.params.id, {
      include: [{ model: MaterialRequisitionItem, as: 'items' }],
    });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    if (!requisition.supplierId) {
      return res.status(400).json({ message: 'Requisition needs a supplier before converting to a Purchase Order' });
    }

    const items = requisition.items.map((it) => ({
      itemId: it.itemId,
      itemCode: it.itemCode,
      itemName: it.itemName,
      details: it.details,
      unit: it.unit,
      budgetQty: it.budgetQty,
      purchaseQty: it.demandQty,
      stockQty: it.stockQty,
      rate: it.rate,
      amount: it.rate * it.demandQty,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

    const order = await PurchaseOrder.create({
      code: 'PO-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().slice(0, 10),
      supplierId: requisition.supplierId,
      projectType: requisition.projectType,
      projectId: requisition.projectId,
      titleOfWork: requisition.titleOfWork,
      task: requisition.task,
      siteId: requisition.siteId,
      categoryId: requisition.categoryId,
      reference: requisition.code,
      subtotal,
      grandTotal: subtotal,
      addedBy: req.user?.name || 'Admin',
    });

    if (items.length && PurchaseOrderItem) {
      await PurchaseOrderItem.bulkCreate(items.map((it) => ({ ...it, purchaseOrderId: order.id })));
    }

    requisition.status = 'Converted';
    requisition.convertedToPurchaseOrderId = order.id;
    await requisition.save();

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TODO: no RFQ model exists yet in this codebase — build server/models/Rfq.js
// and a server/routes/rfq.js first, then wire a real conversion here the
// same way as the two routes above.
router.post('/:id/convert-to-rfq', auth, async (req, res) => {
  res.status(501).json({ message: 'RFQ conversion is not implemented yet' });
});

module.exports = router;