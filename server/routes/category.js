const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Category = require('../models/Category');
const Item = require('../models/Item');
const BillItem = require('../models/BillItem');
const ServiceItem = require('../models/ServiceItem');
const Purchase = require('../models/Purchase');
const PurchaseOrder = require('../models/PurchaseOrder');
const MaterialRequisition = require('../models/MaterialRequisition');
const MaterialUsage = require('../models/MaterialUsage');
const StockTransfer = require('../models/StockTransfer');
const ContractorBill = require('../models/ContractorBill');
const ContractorWorkorder = require('../models/ContractorWorkorder');
const LabourBill = require('../models/LabourBill');
const { blockIfUsed } = require('../utils/deleteGuard');

function generateCode() {
  return 'C' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const categories = await Category.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { type, name, code } = req.body;
    if (!type || !name) {
      return res.status(400).json({ message: 'Type and Name are required' });
    }

    const category = await Category.create({
      type,
      name,
      code: code || generateCode(),
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });

    const fields = ['type', 'name', 'code'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) category[key] = req.body[key];
    });

    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    // categoryId is ON DELETE CASCADE on items and many transaction tables -
    // never delete a category that is in use.
    const id = req.params.id;
    if (await blockIfUsed(res, 'category', [
      { model: Item, where: { categoryId: id }, label: 'items' },
      { model: BillItem, where: { categoryId: id }, label: 'bill items' },
      { model: ServiceItem, where: { categoryId: id }, label: 'service items' },
      { model: Purchase, where: { categoryId: id }, label: 'purchases' },
      { model: PurchaseOrder, where: { categoryId: id }, label: 'purchase orders' },
      { model: MaterialRequisition, where: { categoryId: id }, label: 'material requisitions' },
      { model: MaterialUsage, where: { categoryId: id }, label: 'material usages' },
      { model: StockTransfer, where: { categoryId: id }, label: 'stock transfers' },
      { model: ContractorBill, where: { categoryId: id }, label: 'contractor bills' },
      { model: ContractorWorkorder, where: { categoryId: id }, label: 'contractor work orders' },
      { model: LabourBill, where: { categoryId: id }, label: 'labour bills' },
    ])) return;
    const deleted = await Category.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;