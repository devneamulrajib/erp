const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const Site = require('../models/Site');

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { projectName: { [Op.like]: `%${search}%` } },
      ];
    }
    const sites = await Site.findAll({ where });
    res.json(sites);
  } catch (err) {
    console.error('GET /api/sites failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code, projectTypeName, projectId, projectName, description, location } = req.body;

    if (!projectTypeName) return res.status(400).json({ message: 'Project Type is required' });
    if (!projectId) return res.status(400).json({ message: 'Project is required' });
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    const newSite = await Site.create({
      code: code || generateCode(),
      projectTypeName,
      projectId,
      projectName: projectName || '',
      name: name.trim(),
      description: description || '',
      location: location || '',
    });

    res.status(201).json(newSite);
  } catch (err) {
    console.error('POST /api/sites failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Site.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = ['projectTypeName', 'projectId', 'projectName', 'name', 'description', 'location'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });

    await item.save();
    res.json(item);
  } catch (err) {
    console.error('PUT /api/sites/:id failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Site.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/sites/:id failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;