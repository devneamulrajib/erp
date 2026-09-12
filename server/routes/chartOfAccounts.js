const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const ChartOfAccount = require('../models/ChartOfAccount');
const ChartOfGroup = require('../models/ChartOfGroup');

const uploadDir = path.join(__dirname, '..', 'uploads', 'contacts');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const PREFIX_BY_TYPE = { Customer: 'CUS', Supplier: 'SUP', Investor: 'INV' };

// Always pull the linked Chart of Group alongside each account, so the
// frontend's `item.chartOfGroup.name` (used in tables and view modals)
// is populated instead of coming back undefined.
const GROUP_INCLUDE = { model: ChartOfGroup, as: 'chartOfGroup', attributes: ['id', 'name'] };

router.get('/', auth, async (req, res) => {
  try {
    const { chartOfGroup, contactType, search } = req.query;
    const where = {};
    if (chartOfGroup) where.chartOfGroupId = chartOfGroup;
    if (contactType) where.contactType = contactType;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await ChartOfAccount.findAll({
      where,
      include: [GROUP_INCLUDE],
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/next-code', auth, async (req, res) => {
  try {
    const { contactType } = req.query;
    const prefix = PREFIX_BY_TYPE[contactType];
    if (!prefix) return res.status(400).json({ message: 'Unknown contact type' });

    let code;
    let exists = true;
    while (exists) {
      const random = Math.floor(1000000 + Math.random() * 9000000);
      code = `${prefix}${random}`;
      // eslint-disable-next-line no-await-in-loop
      exists = await ChartOfAccount.findOne({ where: { code } });
    }
    res.json({ code });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await ChartOfAccount.findByPk(req.params.id, { include: [GROUP_INCLUDE] });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const {
      chartOfGroup, code, name, openingBalance, isDefault, contactType,
      mobile, email, nid, address, businessName, buyerReference, creditLimit, dueDate,
    } = req.body;

    if (!chartOfGroup || !code || !name) {
      return res.status(400).json({ message: 'Chart of group, code and name are required' });
    }

    const created = await ChartOfAccount.create({
      chartOfGroupId: chartOfGroup,
      code,
      name,
      openingBalance: openingBalance || 0,
      isDefault: isDefault === 'true' || isDefault === true,
      contactType: contactType || 'Others',
      mobile, email, nid, address, businessName, buyerReference,
      creditLimit: creditLimit || null,
      dueDate: dueDate || null,
      image: req.file ? `/uploads/contacts/${req.file.filename}` : null,
    });

    const populated = await ChartOfAccount.findByPk(created.id, { include: [GROUP_INCLUDE] });
    res.status(201).json(populated);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const item = await ChartOfAccount.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'code', 'name', 'openingBalance', 'isDefault', 'contactType',
      'mobile', 'email', 'nid', 'address', 'businessName', 'buyerReference', 'creditLimit', 'dueDate',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });
    if (req.body.chartOfGroup !== undefined) item.chartOfGroupId = req.body.chartOfGroup;
    if (req.file) item.image = `/uploads/contacts/${req.file.filename}`;

    await item.save();
    const populated = await ChartOfAccount.findByPk(item.id, { include: [GROUP_INCLUDE] });
    res.json(populated);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ChartOfAccount.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;