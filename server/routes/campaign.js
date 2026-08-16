const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const LeadSource = require('../models/LeadSource');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await Campaign.findAll({
      where,
      include: [{ model: LeadSource, attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      name, leadSourceId, description, formId, status,
    } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const item = await Campaign.create({
      name,
      leadSourceId: leadSourceId || null,
      description,
      formId,
      status,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await Campaign.findByPk(item.id, {
      include: [{ model: LeadSource, attributes: ['name'] }],
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Campaign.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    ['name', 'leadSourceId', 'description', 'formId', 'status'].forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key] || null;
    });

    await item.save();
    const populated = await Campaign.findByPk(item.id, {
      include: [{ model: LeadSource, attributes: ['name'] }],
    });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Campaign.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;