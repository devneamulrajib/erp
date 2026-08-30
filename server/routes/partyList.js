const router = require('express').Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PartyContact, Agreement } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'party-list');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

function serialize(row) {
  const json = row.toJSON();
  return {
    ...json,
    _id: json.id,
    agreementLabel: json.agreement ? (json.agreement.title || json.agreement.reference) : null,
    image: json.image ? `/uploads/party-list/${json.image}` : null,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const rows = await PartyContact.findAll({
      include: [{ model: Agreement, as: 'agreement', attributes: ['id', 'title', 'reference'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(rows.map(serialize));
  } catch (err) {
    console.error('GET /api/party-list failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const row = await PartyContact.findByPk(req.params.id, {
      include: [{ model: Agreement, as: 'agreement', attributes: ['id', 'title', 'reference'] }],
    });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(serialize(row));
  } catch (err) {
    console.error('GET /api/party-list/:id failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer upload failed on POST /api/party-list:', err);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /api/party-list body:', req.body);
    console.log('POST /api/party-list file:', req.file ? req.file.filename : 'none');

    const { name, phone, email, nid, position, address, agreementId, type, status, details } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const row = await PartyContact.create({
      name,
      phone: phone || null,
      email: email || null,
      nid: nid || null,
      position: position || null,
      address: address || null,
      agreementId: agreementId ? Number(agreementId) : null,
      type: type || null,
      status: status || null,
      details: details || null,
      image: req.file ? req.file.filename : null,
    });

    res.status(201).json(serialize(row));
  } catch (err) {
    console.error('POST /api/party-list failed:', err);
    res.status(500).json({ message: err.message, detail: err.original ? err.original.sqlMessage : undefined });
  }
});

router.put('/:id', auth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer upload failed on PUT /api/party-list/:id:', err);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const row = await PartyContact.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });

    const fields = ['name', 'phone', 'email', 'nid', 'position', 'address', 'agreementId', 'type', 'status', 'details'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) {
        row[key] = key === 'agreementId' && req.body[key] ? Number(req.body[key]) : req.body[key];
      }
    });
    if (req.file) row.image = req.file.filename;

    await row.save();
    res.json(serialize(row));
  } catch (err) {
    console.error('PUT /api/party-list/:id failed:', err);
    res.status(500).json({ message: err.message, detail: err.original ? err.original.sqlMessage : undefined });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await PartyContact.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/party-list/:id failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;