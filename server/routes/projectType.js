const router = require('express').Router();
const auth = require('../middleware/auth');
const ProjectType = require('../models/ProjectType');

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const projectTypes = await ProjectType.findAll({ order: [['createdAt', 'ASC']] });
    res.json(projectTypes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const newType = await ProjectType.create({
      code: code || generateCode(),
      name: name.trim(),
    });
    res.status(201).json(newType);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const item = await ProjectType.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (name && name.trim()) item.name = name.trim();
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ProjectType.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;