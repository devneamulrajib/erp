const router = require('express').Router();
const auth = require('../middleware/auth');

// TEMPORARY: in-memory store, no MongoDB yet.
// Once Mongo is reconnected, replace this array with a real Site model
// (fields: code, projectTypeName, projectId, projectName, name, description, location)
// and swap each route to use it instead.
let sites = [
  { _id: '8', code: 'P1171952', projectTypeName: 'Real Estate', projectId: '2', projectName: 'Mavie', name: 'Abason Project', description: '', location: '' },
  { _id: '9', code: 'P1883545', projectTypeName: 'Real Estate', projectId: '9', projectName: 'Home', name: 'Admin', description: '', location: '' },
  { _id: '10', code: 'P1572732', projectTypeName: 'Real Estate', projectId: '9', projectName: 'Home', name: 'HPDL', description: '', location: '' },
];
let nextId = 11;

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

// Get a fresh auto-generated code for the "Add" modal, before the user submits
router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

// List all sites
router.get('/', auth, async (req, res) => {
  const { search } = req.query;
  let result = sites;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.projectName || '').toLowerCase().includes(q)
    );
  }

  res.json(result);
});

// Create a site
router.post('/', auth, async (req, res) => {
  const { name, code, projectTypeName, projectId, projectName, description, location } = req.body;

  if (!projectTypeName) {
    return res.status(400).json({ message: 'Project Type is required' });
  }
  if (!projectId) {
    return res.status(400).json({ message: 'Project is required' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const newSite = {
    _id: String(nextId++),
    code: code || generateCode(),
    projectTypeName,
    projectId,
    projectName: projectName || '',
    name: name.trim(),
    description: description || '',
    location: location || '',
  };
  sites.push(newSite);
  res.status(201).json(newSite);
});

// Update a site
router.put('/:id', auth, async (req, res) => {
  const item = sites.find((s) => s._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  const fields = ['projectTypeName', 'projectId', 'projectName', 'name', 'description', 'location'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });

  res.json(item);
});

// Delete a site
router.delete('/:id', auth, async (req, res) => {
  const before = sites.length;
  sites = sites.filter((s) => s._id !== req.params.id);
  if (sites.length === before) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json({ deleted: true });
});

module.exports = router;