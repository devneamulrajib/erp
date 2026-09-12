const router = require('express').Router();
const auth = require('../middleware/auth');
const ProjectManager = require('../models/ProjectManager');

router.get('/', auth, async (req, res) => {
  try {
    const list = await ProjectManager.findAll({ order: [['name', 'ASC']] });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    const item = await ProjectManager.create({ name: name.trim() });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ProjectManager.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;