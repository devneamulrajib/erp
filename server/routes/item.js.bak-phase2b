const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Item, Category, Brand } = require('../models/associations');
const { listOrPage } = require('../utils/paginate');
const Asset = require('../models/Asset');
const PurchaseItem = require('../models/PurchaseItem');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');
const MaterialRequisitionItem = require('../models/MaterialRequisitionItem');
const MaterialUsageItem = require('../models/MaterialUsageItem');
const StockTransferItem = require('../models/StockTransferItem');
const SaleItem = require('../models/SaleItem');
const WorkorderItem = require('../models/WorkorderItem');
const ContractorWorkorderItem = require('../models/ContractorWorkorderItem');
const ContractorBillItem = require('../models/ContractorBillItem');
const LabourBillItem = require('../models/LabourBillItem');
const { blockIfUsed } = require('../utils/deleteGuard');

const TYPE_PREFIX = { Material: 'M', Product: 'P', Service: 'S' };

async function generateCode(categoryId) {
  const category = await Category.findByPk(categoryId);
  const prefix = TYPE_PREFIX[category?.type] || 'M';
  const count = await Item.count({ where: { code: { [Op.like]: `${prefix}%` } } });
  return prefix + String(count + 1).padStart(4, '0');
}

router.get('/', auth, async (req, res) => {
  try {
    const { category, brand, search } = req.query;
    const where = {};
    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await listOrPage(Item, {
      where,
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    }, req.query);

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { category, brand, name, unit, purchasePrice, salePrice, code } = req.body;
    if (!category || !name || !unit) {
      return res.status(400).json({ message: 'Category, Name and Unit are required' });
    }

    const item = await Item.create({
      code: code || (await generateCode(category)),
      categoryId: category,
      brandId: brand || null,
      name,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
    });

    const populated = await Item.findByPk(item.id, {
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
      ],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (req.body.category !== undefined) item.categoryId = req.body.category;
    // Empty / 0 brand means "no brand": store NULL, otherwise MySQL saves 0 and
    // the items -> brands foreign key rejects the update.
    if (req.body.brand !== undefined) item.brandId = req.body.brand || null;
    const fields = ['name', 'unit', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });
    ['purchasePrice', 'salePrice'].forEach((key) => {
      if (req.body[key] !== undefined) item[key] = Number(req.body[key]) || 0;
    });

    await item.save();
    const populated = await Item.findByPk(item.id, {
      include: [
        { model: Category, attributes: ['name'] },
        { model: Brand, attributes: ['name'] },
      ],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    // itemId is ON DELETE CASCADE on purchase order, requisition, stock
    // transfer and asset lines - never delete an item that is in use.
    const id = req.params.id;
    if (await blockIfUsed(res, 'item', [
      { model: PurchaseItem, where: { itemId: id }, label: 'purchase lines' },
      { model: PurchaseOrderItem, where: { itemId: id }, label: 'purchase order lines' },
      { model: MaterialRequisitionItem, where: { itemId: id }, label: 'material requisition lines' },
      { model: MaterialUsageItem, where: { itemId: id }, label: 'material usage lines' },
      { model: StockTransferItem, where: { itemId: id }, label: 'stock transfer lines' },
      { model: SaleItem, where: { itemId: id }, label: 'sale lines' },
      { model: WorkorderItem, where: { itemId: id }, label: 'work order lines' },
      { model: ContractorWorkorderItem, where: { itemId: id }, label: 'contractor work order lines' },
      { model: ContractorBillItem, where: { itemId: id }, label: 'contractor bill lines' },
      { model: LabourBillItem, where: { itemId: id }, label: 'labour bill lines' },
      { model: Asset, where: { itemId: id }, label: 'assets' },
    ])) return;
    const deleted = await Item.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;