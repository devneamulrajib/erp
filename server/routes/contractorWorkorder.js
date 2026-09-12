const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ContractorWorkorder, ContractorWorkorderItem, Party, Project } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'contractor-workorders');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

function generateCode() {
  return 'W/O' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return { ...it, quantity, rate, amount: quantity * rate };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const aitIncluded = !!body.aitIncluded;
  const aitPercent = Number(body.aitPercent) || 0;
  const aitAmount = aitIncluded ? subtotal * (aitPercent / 100) : 0;

  const discount = Number(body.discount) || 0;
  const grandTotal = subtotal + vatAmount + aitAmount - discount;

  return { subtotal, vatIncluded, vatPercent, vatAmount, aitIncluded, aitPercent, aitAmount, discount, grandTotal };
}

const includeList = [
  { model: Party, as: 'supplier', attributes: ['name'] },
  { model: Project, as: 'project', attributes: ['name'] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, supplier, project } = req.query;
    const where = {};
    if (supplier) where.supplierId = supplier;
    if (project) where.projectId = project;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const orders = await ContractorWorkorder.findAll({
      where,
      include: includeList,
      order: [['createdAt', 'DESC']],
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await ContractorWorkorder.findByPk(req.params.id, {
      include: [...includeList, { model: ContractorWorkorderItem }],
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { supplier } = req.body;
    if (!supplier) return res.status(400).json({ message: 'Supplier is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const order = await ContractorWorkorder.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      supplierId: req.body.supplier,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      categoryId: req.body.category,
      refInvoiceNo: req.body.refInvoiceNo,
      contentBody: req.body.contentBody,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await ContractorWorkorderItem.create({ ...it, itemId: it.item, contractorWorkorderId: order.id });
    }

    const populated = await ContractorWorkorder.findByPk(order.id, {
      include: [...includeList, { model: ContractorWorkorderItem }],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await ContractorWorkorder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    const directFields = {
      date: req.body.date,
      supplierId: req.body.supplier,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      categoryId: req.body.category,
      refInvoiceNo: req.body.refInvoiceNo,
      contentBody: req.body.contentBody,
      vatIncluded: req.body.vatIncluded,
      vatPercent: req.body.vatPercent,
      aitIncluded: req.body.aitIncluded,
      aitPercent: req.body.aitPercent,
      discount: req.body.discount,
    };
    Object.keys(directFields).forEach((key) => {
      if (directFields[key] !== undefined) order[key] = directFields[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await ContractorWorkorderItem.destroy({ where: { contractorWorkorderId: order.id } });
      for (const it of items) {
        await ContractorWorkorderItem.create({ ...it, itemId: it.item, contractorWorkorderId: order.id });
      }
    } else {
      items = await ContractorWorkorderItem.findAll({ where: { contractorWorkorderId: order.id } });
    }

    const totals = computeTotals(req.body, items);
    Object.assign(order, totals);

    await order.save();
    const populated = await ContractorWorkorder.findByPk(order.id, {
      include: [...includeList, { model: ContractorWorkorderItem }],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Real file upload — same pattern as LabourBill's attachment endpoint.
router.post('/:id/attachment', auth, (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err) {
      console.error('Attachment upload failed:', err);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const order = await ContractorWorkorder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (req.file) {
      order.attachment = `/uploads/contractor-workorders/${req.file.filename}`;
      await order.save();
    }
    res.json({ attachment: order.attachment });
  } catch (err) {
    console.error('Saving attachment failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContractorWorkorder.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;