const router = require('express').Router();
const auth = require('../middleware/auth');
const BoqTitle = require('../models/BoqTitle');

router.get('/', auth, async (req, res) => {
  try {
    const titles = await BoqTitle.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(titles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const boqTitle = await BoqTitle.create({ title });
    res.status(201).json(boqTitle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const boqTitle = await BoqTitle.findByPk(req.params.id);
    if (!boqTitle) return res.status(404).json({ message: 'Not found' });

    const { title } = req.body;
    if (title !== undefined) boqTitle.title = title;

    await boqTitle.save();
    res.json(boqTitle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BoqTitle.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;