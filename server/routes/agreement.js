const router = require('express').Router();
const auth = require('../middleware/auth');

// TEMPORARY: in-memory store, no MongoDB yet.
let agreements = [
  { _id: '1', date: '2026-05-19', project: '', reference: '', title: '', termsConditions: '', footer: '', parties: [], payments: [] },
  { _id: '2', date: '2026-05-19', project: '', reference: '', title: '', termsConditions: '', footer: '', parties: [], payments: [] },
];
let nextId = 3;

router.get('/', auth, async (req, res) => {
  res.json(agreements);
});

router.get('/:id', auth, async (req, res) => {
  const item = agreements.find((a) => a._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.post('/', auth, async (req, res) => {
  const { date, project, reference, title, termsConditions, footer, parties, payments } = req.body;
  const newAgreement = {
    _id: String(nextId++),
    date: date || '',
    project: project || '',
    reference: reference || '',
    title: title || '',
    termsConditions: termsConditions || '',
    footer: footer || '',
    parties: parties || [],
    payments: payments || [],
  };
  agreements.push(newAgreement);
  res.status(201).json(newAgreement);
});

router.put('/:id', auth, async (req, res) => {
  const item = agreements.find((a) => a._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  const fields = ['date', 'project', 'reference', 'title', 'termsConditions', 'footer', 'parties', 'payments'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  res.json(item);
});

router.delete('/:id', auth, async (req, res) => {
  const before = agreements.length;
  agreements = agreements.filter((a) => a._id !== req.params.id);
  if (agreements.length === before) return res.status(404).json({ message: 'Not found' });
  res.json({ deleted: true });
});

router.post('/:id/duplicate', auth, async (req, res) => {
  const item = agreements.find((a) => a._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  const copy = { ...item, _id: String(nextId++) };
  agreements.push(copy);
  res.status(201).json(copy);
});

module.exports = router;