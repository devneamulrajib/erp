const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const limiter = require('../utils/attemptLimiter');

// Creating users requires a logged-in admin/superadmin (the ERP UI uses
// POST /api/users; this endpoint is kept only for API/script use).
// Only a superadmin may create another superadmin.
router.post('/register', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = req.body.role || 'user';
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can create a superadmin' });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Brute-force guard (same in-memory limiter as the portal login):
    // 5 wrong attempts for one email from one IP -> locked for 15 minutes.
    // Keyed by IP + email so one person's typos can't lock out a whole office
    // sharing the same public IP.
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress;
    const key = `staff:${ip}:${String(email).trim().toLowerCase()}`;
    const minutesLeft = limiter.check(key);
    if (minutesLeft > 0) {
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).` });
    }

    // Superadmin fallback via .env — kept for initial setup / recovery access.
    if (process.env.SUPERADMIN_EMAIL && process.env.SUPERADMIN_PASSWORD && email === process.env.SUPERADMIN_EMAIL && password === process.env.SUPERADMIN_PASSWORD) {
      limiter.clear(key);
      const token = jwt.sign(
        { id: 'temp-superadmin', role: 'superadmin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        token,
        user: { id: 'temp-superadmin', name: process.env.SUPERADMIN_NAME, email, role: 'superadmin' },
      });
    }

    // Regular team members: check the database.
    const user = await User.findOne({ where: { email } });
    if (!user) {
      limiter.fail(key);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'This account has been deactivated' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      limiter.fail(key);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    limiter.clear(key);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;