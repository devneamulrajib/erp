const router = require('express').Router();
const auth = require('../middleware/auth');
const MaterialRequisition = require('../models/MaterialRequisition');
const Purchase = require('../models/Purchase');
const PurchaseOrder = require('../models/PurchaseOrder');

function generateCode() {
  return 'REQ-' + Math.floor(100 + Math.random() * 900);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
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

const populateFields = [
  { path: 'supplier', select: 'name' },
  { path: 'project', select: 'name' },
  { path: 'site', select: 'name' },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, company, supplier, project, titleOfWork } = req.query;
    const filter = {};
    if (company) filter.company = company;
    if (supplier) filter.supplier = supplier;
    if (project) filter.project = project;
    if (titleOfWork) filter.titleOfWork = titleOfWork;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const requisitions = await MaterialRequisition.find(filter)
      .populate(populateFields)
      .sort({ createdAt: -1 });

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findById(req.params.id).populate(populateFields);
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
      date, demandDate, company, supplier, projectType, project,
      titleOfWork, task, site, category, reference,
      items: reqItems,
      subtotal,
      attachment, note,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await requisition.populate(populateFields);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'demandDate', 'company', 'supplier', 'projectType', 'project',
      'titleOfWork', 'task', 'site', 'category', 'reference', 'attachment', 'note',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key];
    });

    if (req.body.items !== undefined) {
      requisition.items = cleanItems(req.body.items);
      requisition.subtotal = computeSubtotal(requisition.items);
    }

    await requisition.save();
    const populated = await requisition.populate(populateFields);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await MaterialRequisition.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Convert requisition items -> a real Purchase record
router.post('/:id/convert-to-purchase', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    if (!requisition.supplier) {
      return res.status(400).json({ message: 'Requisition needs a supplier before converting to a Purchase' });
    }

    const items = requisition.items.map((it) => ({
      item: it.item,
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
      supplier: requisition.supplier,
      ledger: 'Closing Stock',
      projectType: requisition.projectType,
      project: requisition.project,
      titleOfWork: requisition.titleOfWork,
      task: requisition.task,
      site: requisition.site,
      category: requisition.category,
      reference: requisition.code,
      items,
      subtotal,
      grandTotal: subtotal,
      paid: 0,
      due: subtotal,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    requisition.status = 'Converted';
    requisition.convertedTo.purchase = purchase._id;
    await requisition.save();

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Convert requisition items -> a real Purchase Order record
router.post('/:id/convert-to-purchase-order', auth, async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findById(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    if (!requisition.supplier) {
      return res.status(400).json({ message: 'Requisition needs a supplier before converting to a Purchase Order' });
    }

    const items = requisition.items.map((it) => ({
      item: it.item,
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
      supplier: requisition.supplier,
      projectType: requisition.projectType,
      project: requisition.project,
      titleOfWork: requisition.titleOfWork,
      task: requisition.task,
      site: requisition.site,
      category: requisition.category,
      reference: requisition.code,
      items,
      subtotal,
      grandTotal: subtotal,
      approvals: [{ name: 'Admin', approved: false }],
      addedBy: req.user?.name || 'Admin',
    });

    requisition.status = 'Converted';
    requisition.convertedTo.purchaseOrder = order._id;
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