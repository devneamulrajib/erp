const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const ChartOfAccount = require('../models/ChartOfAccount');

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

router.get('/', auth, async (req, res) => {
  try {
    const { chartOfGroup, contactType, search } = req.query;
    const filter = {};
    if (chartOfGroup) filter.chartOfGroup = chartOfGroup;
    if (contactType) filter.contactType = contactType;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await ChartOfAccount.find(filter).populate('chartOfGroup', 'name').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate a unique code for a contact type, e.g. CUS4065311
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
      exists = await ChartOfAccount.exists({ code });
    }
    res.json({ code });
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

    const item = await ChartOfAccount.create({
      chartOfGroup,
      code,
      name,
      openingBalance: openingBalance || 0,
      isDefault: isDefault === 'true' || isDefault === true,
      contactType: contactType || 'Others',
      mobile,
      email,
      nid,
      address,
      businessName,
      buyerReference,
      creditLimit: creditLimit || undefined,
      dueDate: dueDate || undefined,
      image: req.file ? `/uploads/contacts/${req.file.filename}` : undefined,
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const item = await ChartOfAccount.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'chartOfGroup', 'code', 'name', 'openingBalance', 'isDefault', 'contactType',
      'mobile', 'email', 'nid', 'address', 'businessName', 'buyerReference', 'creditLimit', 'dueDate',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });
    if (req.file) item.image = `/uploads/contacts/${req.file.filename}`;

    await item.save();
    res.json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ChartOfAccount.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;