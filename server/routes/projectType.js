const router = require('express').Router();
const auth = require('../middleware/auth');

// TEMPORARY: in-memory store, no MongoDB yet.
// Once Mongo is reconnected, replace this array + the handlers below with a
// real ProjectType Mongoose model (fields: code, name) and swap each route
// to use it instead (findOne/find/create/findByIdAndUpdate/findByIdAndDelete).
let projectTypes = [
  { _id: '14', code: 'P4773027', name: 'Office' },
  { _id: '15', code: 'P7566761', name: 'Real Estate' },
  { _id: '16', code: 'P9579440', name: 'Construction' },
  { _id: '17', code: 'P2596945', name: 'Architechtural & Interior Design' },
  { _id: '18', code: 'P1554959', name: 'Land Share' },
  { _id: '19', code: 'P7784999', name: 'Share Project' },
  { _id: '20', code: 'P1718818', name: 'Land Sell' },
];
let nextId = 21;

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

// Get a fresh auto-generated code for the "Add" modal, before the user submits
router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

// List all project types
router.get('/', auth, async (req, res) => {
  res.json(projectTypes);
});

// Create a project type
router.post('/', auth, async (req, res) => {
  const { name, code } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  const newType = {
    _id: String(nextId++),
    code: code || generateCode(),
    name: name.trim(),
  };
  projectTypes.push(newType);
  res.status(201).json(newType);
});

// Update a project type's name
router.put('/:id', auth, async (req, res) => {
  const { name } = req.body;
  const item = projectTypes.find((p) => p._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  if (name && name.trim()) item.name = name.trim();
  res.json(item);
});

// Delete a project type
router.delete('/:id', auth, async (req, res) => {
  const before = projectTypes.length;
  projectTypes = projectTypes.filter((p) => p._id !== req.params.id);
  if (projectTypes.length === before) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json({ deleted: true });
});

module.exports = router;