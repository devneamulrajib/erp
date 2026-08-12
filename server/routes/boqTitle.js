const router = require('express').Router();
const auth = require('../middleware/auth');
const BoqTitle = require('../models/BoqTitle');

router.get('/', auth, async (req, res) => {
  try {
    const titles = await BoqTitle.find().populate('projectType', 'name').sort({ createdAt: -1 });
    res.json(titles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { projectType, title } = req.body;
    if (!projectType || !title) {
      return res.status(400).json({ message: 'Project Type and Title are required' });
    }
    const boqTitle = await BoqTitle.create({ projectType, title });
    res.status(201).json(boqTitle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const boqTitle = await BoqTitle.findById(req.params.id);
    if (!boqTitle) return res.status(404).json({ message: 'Not found' });

    const { projectType, title } = req.body;
    if (projectType !== undefined) boqTitle.projectType = projectType;
    if (title !== undefined) boqTitle.title = title;

    await boqTitle.save();
    res.json(boqTitle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BoqTitle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;