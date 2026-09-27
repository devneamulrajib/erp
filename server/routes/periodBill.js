const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PeriodBill, ChartOfAccount, Project, Site } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'period-bills');
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
  return 'PB' + Math.floor(1000000 + Math.random() * 9000000);
}

function computeTotals(body) {
  const projectCost = Number(body.projectCost) || 0;
  const percentage = Number(body.percentage) || 0;
  const constructionCost = projectCost * (percentage / 100);
  const serviceCharge = Number(body.serviceCharge) || 0;
  const grandTotal = constructionCost + serviceCharge;

  return { projectCost, percentage, constructionCost, serviceCharge, grandTotal };
}

const listInclude = [
  { model: ChartOfAccount, as: 'customer', attributes: ['id', 'name'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, customer, project } = req.query;
    const where = {};
    if (customer) where.customerId = customer;
    if (project) where.projectId = project;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await PeriodBill.findAll({
      where,
      include: listInclude,
      order: [['createdAt', 'DESC']],
    });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await PeriodBill.findByPk(req.params.id, {
      include: [
        { model: ChartOfAccount, as: 'customer', attributes: ['id', 'name'] },
        { model: ChartOfAccount, as: 'ledger', attributes: ['id', 'name', 'code'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Site, as: 'site', attributes: ['id', 'name'] },
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customer, ledger, site, project } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required' });

    const totals = computeTotals(req.body);

    const bill = await PeriodBill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      customerId: customer,
      ledgerId: ledger || null,
      siteId: site || null,
      refWoNo: req.body.refWoNo,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      projectId: project || null,
      contentBody: req.body.contentBody,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await PeriodBill.findByPk(bill.id, { include: listInclude });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await PeriodBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const fieldMap = {
      date: 'date', refWoNo: 'refWoNo', startDate: 'startDate', endDate: 'endDate',
      contentBody: 'contentBody',
      customer: 'customerId', ledger: 'ledgerId', site: 'siteId', project: 'projectId',
    };
    Object.entries(fieldMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) bill[col] = req.body[bodyKey];
    });

    const totals = computeTotals({ ...bill.toJSON(), ...req.body });
    Object.assign(bill, totals);

    await bill.save();
    const populated = await PeriodBill.findByPk(bill.id, { include: listInclude });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
    const bill = await PeriodBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    if (req.file) {
      bill.attachment = `/uploads/period-bills/${req.file.filename}`;
      await bill.save();
    }
    res.json({ attachment: bill.attachment });
  } catch (err) {
    console.error('Saving attachment failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await PeriodBill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;