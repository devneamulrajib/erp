const router = require('express').Router();
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');

function generateCode() {
  return 'CUS' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, name, mobile, email, nid, address, buyerReference,
      creditLimit, dueDate, openingBalance, image, chartOfGroup,
      createUser, nominees,
    } = req.body;

    if (!name || !mobile || !nid) {
      return res.status(400).json({ message: 'Name, Mobile and NID are required' });
    }

    const customer = await Customer.create({
      code: code || generateCode(),
      name, mobile, email, nid, address, buyerReference,
      creditLimit: Number(creditLimit) || 0,
      dueDate: dueDate || undefined,
      openingBalance: Number(openingBalance) || 0,
      image, chartOfGroup,
      createUser: !!createUser,
      nominees: Array.isArray(nominees) ? nominees.filter((n) => n.name) : [],
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'name', 'mobile', 'email', 'nid', 'address', 'buyerReference',
      'creditLimit', 'dueDate', 'openingBalance', 'image', 'chartOfGroup',
      'createUser', 'nominees',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) customer[key] = req.body[key];
    });

    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;