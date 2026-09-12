const router = require('express').Router();
const auth = require('../middleware/auth');
const { BankAccount } = require('../models/associations');

router.get('/', auth, async (req, res) => {
  try {
    const items = await BankAccount.findAll({ order: [['name', 'ASC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, balance } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const item = await BankAccount.create({
      name,
      balance: Number(balance) || 0,
      lastUpdated: new Date(),
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    const { name, balance } = req.body;
    if (name !== undefined) item.name = name;
    if (balance !== undefined) item.balance = Number(balance) || 0;
    item.lastUpdated = new Date();
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BankAccount.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;