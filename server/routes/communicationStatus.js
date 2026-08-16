const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const CommunicationStatus = require('../models/CommunicationStatus');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await CommunicationStatus.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, status, description, isDefault, leadStage } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const item = await CommunicationStatus.create({
      name, status, description,
      isDefault: !!isDefault,
      leadStage,
      addedBy: req.user?.name || 'Admin',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await CommunicationStatus.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'status', 'description', 'isDefault', 'leadStage'];
    fields.forEach((key) => {
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
    const deleted = await CommunicationStatus.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;