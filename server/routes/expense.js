const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');

const uploadDir = path.join(__dirname, '..', 'uploads', 'expenses');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

async function generateReference() {
  const count = await Expense.countDocuments();
  return `EXP${String(count + 1).padStart(5, '0')}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateReference() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { project, drAccount, crAccount, from, to } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (drAccount) filter.drAccount = drAccount;
    if (crAccount) filter.crAccount = crAccount;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { project, category, drAccount, crAccount, amount, reference, date } = req.body;

    if (!drAccount || !crAccount || !amount) {
      return res.status(400).json({ message: 'Debit account, Credit account and Amount are required' });
    }

    const expense = await Expense.create({
      project: project || '',
      category: category || '',
      drAccount,
      crAccount,
      amount: Number(amount),
      reference: reference || await generateReference(),
      date: date || Date.now(),
      addedBy: req.user?.name || 'Admin',
      attachment: req.file ? `/uploads/expenses/${req.file.filename}` : undefined,
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });

    const fields = ['project', 'category', 'drAccount', 'crAccount', 'amount', 'reference', 'date', 'status'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) expense[key] = req.body[key];
    });
    if (req.file) expense.attachment = `/uploads/expenses/${req.file.filename}`;

    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Expense.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });

    const copy = original.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.reference = await generateReference();
    copy.date = Date.now();
    copy.status = 'pending';
    copy.approvals = [];

    const created = await Expense.create(copy);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;