const router = require('express').Router();
const auth = require('../middleware/auth');
const { Purchase, PurchaseItem, PurchasePayment, PurchaseApproval } = require('../models/associations');

function generateCode() {
  return 'PUR' + Math.floor(1000000 + Math.random() * 9000000);
}

function computeTotals(items, discount, deliveryCharge) {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.rate) || 0) * (Number(it.purchaseQty) || 0),
    0
  );
  const grandTotal = subtotal - (Number(discount) || 0) + (Number(deliveryCharge) || 0);
  return { subtotal, grandTotal };
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    budgetQty: Number(it.budgetQty) || 0,
    purchaseQty: Number(it.purchaseQty) || 0,
    stockQty: Number(it.stockQty) || 0,
    amount: (Number(it.rate) || 0) * (Number(it.purchaseQty) || 0),
  }));
}

const includeAll = [{ model: PurchaseItem }, { model: PurchasePayment }, { model: PurchaseApproval }];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

// Best-effort running stock: total purchased minus total used.
router.get('/stock/:itemId', auth, async (req, res) => {
  try {
    const purchaseItems = await PurchaseItem.findAll({ where: { itemId: req.params.itemId } });
    const purchased = purchaseItems.reduce((sum, it) => sum + (Number(it.purchaseQty) || 0), 0);

    let used = 0;
    try {
      const { MaterialUsageItem } = require('../models/associations');
      const usageItems = await MaterialUsageItem.findAll({ where: { itemId: req.params.itemId } });
      used = usageItems.reduce((sum, it) => sum + (Number(it.useQty) || 0), 0);
    } catch {
      // MaterialUsage model not present yet — skip subtraction
    }

    res.json({ stockQty: purchased - used });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stock report: all items with purchased, used, transferred and remaining stock.
router.get('/stock-report/all', auth, async (req, res) => {
  try {
    const Item = require('../models/Item');
    const items = await Item.findAll({ raw: true });

    const purchaseItems = await PurchaseItem.findAll({ raw: true });

    let usageItems = [];
    try {
      const { MaterialUsageItem } = require('../models/associations');
      usageItems = await MaterialUsageItem.findAll({ raw: true });
    } catch { /* not present yet */ }

    const result = items.map((item) => {
      const purchased = purchaseItems
        .filter((p) => p.itemId === item.id)
        .reduce((sum, p) => sum + (Number(p.purchaseQty) || 0), 0);

      const used = usageItems
        .filter((u) => u.itemId === item.id)
        .reduce((sum, u) => sum + (Number(u.useQty) || 0), 0);

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        purchased,
        used,
        stockQty: purchased - used,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
      if (from) where.date[require('sequelize').Op.gte] = from;
      if (to) where.date[require('sequelize').Op.lte] = to;
    }

    const purchases = await Purchase.findAll({
      where,
      include: includeAll,
      order: [['createdAt', 'DESC']],
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, { include: includeAll });
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, supplier, ledger, projectType, project, titleOfWork, task,
      site, category, reference, items, discount, deliveryCharge, paid,
      note, attachment, payments,
    } = req.body;

    if (!supplier || !ledger) {
      return res.status(400).json({ message: 'Supplier and Ledger are required' });
    }

    const purchaseItems = cleanItems(items);
    const { subtotal, grandTotal } = computeTotals(purchaseItems, discount, deliveryCharge);
    const numPaid = Number(paid) || 0;

    const purchase = await Purchase.create({
      code: code || generateCode(),
      date,
      supplierId: supplier,
      ledger,
      projectType,
      projectId: project,
      titleOfWork,
      task,
      siteId: site,
      categoryId: category,
      reference,
      subtotal,
      discount: Number(discount) || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      grandTotal,
      paid: numPaid,
      due: grandTotal - numPaid,
      note,
      attachment,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of purchaseItems) {
      await PurchaseItem.create({ ...it, itemId: it.item, purchaseId: purchase.id });
    }
    if (Array.isArray(payments)) {
      for (const p of payments) {
        await PurchasePayment.create({ ...p, purchaseId: purchase.id });
      }
    }
    await PurchaseApproval.create({ name: 'Admin', approved: false, purchaseId: purchase.id });

    const populated = await Purchase.findByPk(purchase.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Not found' });

    const fields = ['date', 'projectType', 'titleOfWork', 'task', 'reference', 'note', 'attachment'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) purchase[key] = req.body[key];
    });
    if (req.body.supplier !== undefined) purchase.supplierId = req.body.supplier;
    if (req.body.ledger !== undefined) purchase.ledger = req.body.ledger;
    if (req.body.project !== undefined) purchase.projectId = req.body.project;
    if (req.body.site !== undefined) purchase.siteId = req.body.site;
    if (req.body.category !== undefined) purchase.categoryId = req.body.category;

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await PurchaseItem.destroy({ where: { purchaseId: purchase.id } });
      for (const it of items) {
        await PurchaseItem.create({ ...it, itemId: it.item, purchaseId: purchase.id });
      }
    } else {
      items = await PurchaseItem.findAll({ where: { purchaseId: purchase.id } });
    }

    if (req.body.payments !== undefined) {
      await PurchasePayment.destroy({ where: { purchaseId: purchase.id } });
      for (const p of req.body.payments) {
        await PurchasePayment.create({ ...p, purchaseId: purchase.id });
      }
    }

    if (req.body.discount !== undefined) purchase.discount = Number(req.body.discount) || 0;
    if (req.body.deliveryCharge !== undefined) purchase.deliveryCharge = Number(req.body.deliveryCharge) || 0;

    const { subtotal, grandTotal } = computeTotals(items, purchase.discount, purchase.deliveryCharge);
    purchase.subtotal = subtotal;
    purchase.grandTotal = grandTotal;
    if (req.body.paid !== undefined) purchase.paid = Number(req.body.paid) || 0;
    purchase.due = purchase.grandTotal - purchase.paid;

    await purchase.save();
    const populated = await Purchase.findByPk(purchase.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Purchase.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;