// server/routes/investorExtras.js
// Admin-side documents, communication, notes and activity for one investor.
// Mounted from routes/investor.js, so paths are under /investor-management.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const auth = require('../middleware/auth');
const { Investor, Investment } = require('../models/associations');
const InvestorDocument = require('../models/InvestorDocument');
const InvestorMessage = require('../models/InvestorMessage');
const InvestorNote = require('../models/InvestorNote');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/activityLog');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'investor-docs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DOC_CATEGORIES = ['agreement', 'receipt', 'statement', 'kyc', 'certificate', 'other'];
const CHANNELS = ['portal', 'call', 'whatsapp', 'email', 'meeting'];
const CHANNEL_LABELS = {
  portal: 'Portal message sent',
  call: 'Phone call logged',
  whatsapp: 'WhatsApp contact logged',
  email: 'Email logged',
  meeting: 'Meeting logged',
};
const ALLOWED_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('This file type is not allowed.'));
  },
});

const uploadSingle = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (10 MB max).' : err.message;
    res.status(400).json({ message });
  });

// Staff only: portal-type users must never reach these routes
const staffOnly = [
  auth,
  (req, res, next) => {
    if (['investor', 'customer', 'supplier'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    next();
  },
];

const who = (req) => req.user?.name || req.user?.username || req.user?.email || 'Admin';
const short = (s) => String(s || '').slice(0, 240);
const log = (req, investorId, action, message, amount) =>
  logActivity({
    module: 'Investor',
    action,
    message: short(message),
    amount,
    relatedType: 'Investor',
    relatedId: Number(investorId),
    performedBy: who(req),
  });

const publicDoc = (doc) => {
  const j = doc.toJSON();
  delete j.fileName; // internal storage name never leaves the server
  return j;
};

/* ------------------------------ Documents ------------------------------ */

router.get('/investors/:id/documents', ...staffOnly, async (req, res) => {
  try {
    const rows = await InvestorDocument.findAll({
      where: { investorId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows.map(publicDoc));
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investors/:id/documents', ...staffOnly, uploadSingle, async (req, res) => {
  const cleanup = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) {
      cleanup();
      return res.status(404).json({ message: 'Investor not found' });
    }
    if (!req.file) return res.status(400).json({ message: 'Please choose a file to upload.' });

    // multer reads filenames as latin1; restore UTF-8 so Bengali names survive
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const category = DOC_CATEGORIES.includes(req.body.category) ? req.body.category : 'other';

    let investmentId = null;
    if (req.body.investmentId) {
      const inv = await Investment.findOne({
        where: { id: req.body.investmentId, investorId: investor.id },
      });
      if (!inv) {
        cleanup();
        return res.status(400).json({ message: 'That investment does not belong to this investor.' });
      }
      investmentId = inv.id;
    }

    const title = String(req.body.title || '').trim() || path.parse(originalName).name;

    const doc = await InvestorDocument.create({
      investorId: investor.id,
      investmentId,
      title,
      category,
      fileName: req.file.filename,
      originalName,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      visibleToInvestor: req.body.visibleToInvestor !== 'false',
      uploadedBy: who(req),
    });

    await log(req, investor.id, 'Document Added', `Document added: ${title}`);
    res.status(201).json(publicDoc(doc));
  } catch (err) {
    cleanup();
    console.error('Upload document error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/documents/:docId', ...staffOnly, async (req, res) => {
  try {
    const doc = await InvestorDocument.findByPk(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const updates = {};
    if (typeof req.body.visibleToInvestor === 'boolean') updates.visibleToInvestor = req.body.visibleToInvestor;
    if (typeof req.body.title === 'string' && req.body.title.trim()) updates.title = req.body.title.trim();
    if (DOC_CATEGORIES.includes(req.body.category)) updates.category = req.body.category;

    await doc.update(updates);
    res.json(publicDoc(doc));
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/documents/:docId', ...staffOnly, async (req, res) => {
  try {
    const doc = await InvestorDocument.findByPk(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileName));
    await doc.destroy();
    fs.unlink(filePath, () => {});

    await log(req, doc.investorId, 'Document Removed', `Document removed: ${doc.title}`);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/documents/:docId/file', ...staffOnly, async (req, res) => {
  try {
    const doc = await InvestorDocument.findByPk(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File is missing from the server.' });

    res.download(filePath, doc.originalName);
  } catch (err) {
    console.error('Download document error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ----------------------------- Communication ---------------------------- */

router.get('/investors/:id/messages', ...staffOnly, async (req, res) => {
  try {
    const rows = await InvestorMessage.findAll({
      where: { investorId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: 300,
    });
    res.json(rows);
  } catch (err) {
    console.error('List messages error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investors/:id/messages', ...staffOnly, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Write a message or a short summary first.' });

    const channel = CHANNELS.includes(req.body.channel) ? req.body.channel : 'portal';
    // A portal message from staff is always outbound; other channels can go either way
    const direction =
      channel === 'portal' ? 'outbound' : req.body.direction === 'inbound' ? 'inbound' : 'outbound';

    const message = await InvestorMessage.create({
      investorId: investor.id,
      channel,
      direction,
      subject: String(req.body.subject || '').trim().slice(0, 250) || null,
      body,
      sentBy: who(req),
    });

    await log(req, investor.id, 'Message Logged', CHANNEL_LABELS[channel]);
    res.status(201).json(message);
  } catch (err) {
    console.error('Create message error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------- Notes -------------------------------- */

router.get('/investors/:id/notes', ...staffOnly, async (req, res) => {
  try {
    const rows = await InvestorNote.findAll({
      where: { investorId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    console.error('List notes error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investors/:id/notes', ...staffOnly, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Write the note first.' });

    const note = await InvestorNote.create({
      investorId: investor.id,
      body,
      visibility: req.body.visibility === 'shared' ? 'shared' : 'internal',
      createdBy: who(req),
    });

    await log(req, investor.id, 'Note Added', 'Note added');
    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/notes/:noteId', ...staffOnly, async (req, res) => {
  try {
    const note = await InvestorNote.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const updates = {};
    if (['internal', 'shared'].includes(req.body.visibility)) updates.visibility = req.body.visibility;
    if (typeof req.body.body === 'string' && req.body.body.trim()) updates.body = req.body.body.trim();

    await note.update(updates);
    res.json(note);
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/notes/:noteId', ...staffOnly, async (req, res) => {
  try {
    const note = await InvestorNote.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    await note.destroy();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ----------------------------- Activity log ----------------------------- */

router.get('/investors/:id/activity', ...staffOnly, async (req, res) => {
  try {
    const rows = await ActivityLog.findAll({
      where: { relatedType: 'Investor', relatedId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(rows);
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;