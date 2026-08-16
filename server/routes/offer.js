const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { Offer } = require('../models/associations');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await Offer.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, status, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const item = await Offer.create({
      name,
      status,
      description,
      addedBy: req.user?.name || 'Admin',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Offer.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    ['name', 'status', 'description'].forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Offer.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;