const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  MaterialRequisition, MaterialRequisitionItem, MaterialRequisitionApproval,
  MaterialRequisitionQuotation, MaterialRequisitionQuotationItem,
  ChartOfAccount, Project, Site, Category,
  Purchase, PurchaseItem, PurchaseOrder, PurchaseOrderItem,
} = require('../models/associations');
const notifyAdmin = require('../utils/notify');

function generateCode() {
  return 'REQ-' + Math.floor(100 + Math.random() * 900);
}

function sendError(res, err) {
  const detail = Array.isArray(err.errors) && err.errors.length
    ? err.errors.map((e) => e.message).join('; ')
    : err.message;
  res.status(500).json({ message: detail });
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
    rate: 0,
    amount: 0,
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

const listInclude = [
  { model: ChartOfAccount, as: 'supplier', attributes: ['name'] },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
  { model: MaterialRequisitionApproval, as: 'approvals' },
  { model: MaterialRequisitionQuotation, as: 'quotations', attributes: ['id', 'status'] },
];

const detailInclude = [
  ...listInclude,
  { model: MaterialRequisitionItem, as: 'items' },
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
    sendError(res, err);
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findByPk(req.params.id, { include: detailInclude });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id/quotations', auth, async (req, res) => {
  try {
    const quotations = await MaterialRequisitionQuotation.findAll({
      where: { materialRequisitionId: req.params.id },
      include: [
        { model: MaterialRequisitionQuotationItem, as: 'items' },
        { model: ChartOfAccount, as: 'supplier', attributes: ['name'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json(quotations);
  } catch (err) {
    sendError(res, err);
  }
});

// Admin: accept one supplier's quotation. Rejects the rest, then auto-converts
// the requisition into a Purchase Order using ONLY the items the supplier
// marked available, at the qty/rate THEY quoted (not the original demand qty).
router.post('/:id/quotations/:quotationId/accept', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findByPk(req.params.id, {
      include: [{ model: MaterialRequisitionItem, as: 'items' }],
    });
    if (!requisition) return res.status(404).json({ message: 'Requisition not found' });

    const quotation = await MaterialRequisitionQuotation.findOne({
      where: { id: req.params.quotationId, materialRequisitionId: requisition.id },
      include: [{ model: MaterialRequisitionQuotationItem, as: 'items' }],
    });
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    const qItemsById = Object.fromEntries(
      quotation.items.map((qi) => [qi.materialRequisitionItemId, qi])
    );

    const items = requisition.items
      .map((it) => ({ it, qi: qItemsById[it.id] }))
      .filter(({ qi }) => qi && qi.available !== false)
      .map(({ it, qi }) => {
        const rate = Number(qi.quotedRate) || 0;
        const purchaseQty = Number(qi.offeredQty) || 0;
        return {
          itemId: it.itemId,
          itemCode: it.itemCode,
          itemName: it.itemName,
          details: it.details,
          unit: it.unit,
          budgetQty: it.budgetQty,
          purchaseQty,
          stockQty: it.stockQty,
          rate,
          amount: rate * purchaseQty,
        };
      });

    if (items.length === 0) {
      return res.status(400).json({ message: 'This quotation has no deliverable items to convert' });
    }

    await MaterialRequisitionQuotation.update(
      { status: 'Rejected' },
      { where: { materialRequisitionId: requisition.id, id: { [Op.ne]: quotation.id } } },
    );
    quotation.status = 'Accepted';
    await quotation.save();

    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

    const order = await PurchaseOrder.create({
      code: 'PO-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().slice(0, 10),
      supplierId: quotation.supplierId,
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

    await PurchaseOrderItem.bulkCreate(items.map((it) => ({ ...it, purchaseOrderId: order.id })));

    requisition.status = 'Converted';
    requisition.supplierId = quotation.supplierId;
    requisition.convertedToPurchaseOrderId = order.id;
    await requisition.save();

    // Was previously missing entirely — this is why the supplier saw nothing
    // in the portal after admin accepted their quotation.
    await notifyAdmin.notifySupplier(
      quotation.supplierId,
      'requisition_accepted',
      `Your quotation for ${requisition.code} was accepted — Purchase Order ${order.code} created.`,
      'PurchaseOrder',
      order.id,
    );

    res.json({ quotation, purchaseOrder: order });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/quotations/:quotationId/reject', auth, async (req, res) => {
  try {
    const quotation = await MaterialRequisitionQuotation.findOne({
      where: { id: req.params.quotationId, materialRequisitionId: req.params.id },
    });
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    quotation.status = 'Rejected';
    await quotation.save();
    res.json(quotation);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/quotations/:quotationId/request-correction', auth, async (req, res) => {
  try {
    const quotation = await MaterialRequisitionQuotation.findOne({
      where: { id: req.params.quotationId, materialRequisitionId: req.params.id },
    });
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    quotation.status = 'NeedsCorrection';
    quotation.correctionNote = req.body.note || null;
    await quotation.save();
    res.json(quotation);
  } catch (err) {
    sendError(res, err);
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

    // New requisition sent to a specific supplier — notify them live too.
    if (requisition.supplierId) {
      await notifyAdmin.notifySupplier(
        requisition.supplierId,
        'requisition_new',
        `New material requisition ${requisition.code} sent to you`,
        'MaterialRequisition',
        requisition.id,
      );
    }

    const populated = await MaterialRequisition.findByPk(requisition.id, { include: detailInclude });
    res.status(201).json(populated);
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await MaterialRequisition.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    sendError(res, err);
  }
});

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
    sendError(res, err);
  }
});

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

    // Same case as the quotation-accept route above: notify the supplier.
    if (requisition.supplierId) {
      await notifyAdmin.notifySupplier(
        requisition.supplierId,
        'requisition_accepted',
        `${requisition.code} was converted to Purchase Order ${order.code}.`,
        'PurchaseOrder',
        order.id,
      );
    }

    res.status(201).json(order);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/convert-to-rfq', auth, async (req, res) => {
  res.status(501).json({ message: 'RFQ conversion is not implemented yet' });
});

module.exports = router;