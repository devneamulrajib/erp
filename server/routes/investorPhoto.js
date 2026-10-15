// server/routes/investorPhoto.js
// Investor profile photo: upload, replace, remove and read.
// Mounted from routes/investor.js, so paths are under /investor-management.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const auth = require('../middleware/auth');
const { Investor } = require('../models/associations');

const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'investor-photos');
fs.mkdirSync(PHOTO_DIR, { recursive: true });

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

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

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTO_DIR),
    filename: (req, file, cb) =>
      cb(
        null,
        `${req.params.id}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}${path
          .extname(file.originalname)
          .toLowerCase()}`
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('The photo must be a JPG, PNG or WEBP image.'));
  },
});

const uploadPhoto = (req, res, next) =>
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo is too large (5 MB max).' : err.message;
    res.status(400).json({ message });
  });

const removeFile = (name) => {
  if (!name) return;
  fs.unlink(path.join(PHOTO_DIR, path.basename(name)), () => {});
};

router.post('/investors/:id/photo', ...staffOnly, uploadPhoto, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ message: 'Investor not found' });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose a photo to upload.' });

    const old = investor.profileImage;
    await investor.update({ profileImage: req.file.filename });
    removeFile(old);

    res.json({ profileImage: req.file.filename });
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    console.error('Upload investor photo error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/investors/:id/photo', ...staffOnly, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    const old = investor.profileImage;
    await investor.update({ profileImage: null });
    removeFile(old);

    res.json({ message: 'Photo removed' });
  } catch (err) {
    console.error('Delete investor photo error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/investors/:id/photo', ...staffOnly, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor || !investor.profileImage) return res.status(404).json({ message: 'No photo' });

    const filePath = path.join(PHOTO_DIR, path.basename(investor.profileImage));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Photo file is missing.' });

    res.set('Cache-Control', 'private, max-age=300');
    res.sendFile(filePath);
  } catch (err) {
    console.error('Read investor photo error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;