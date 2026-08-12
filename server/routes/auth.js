const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.json({ id: user._id, email: user.email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // TEMPORARY: hardcoded check against .env, no DB required yet
    if (email === process.env.SUPERADMIN_EMAIL && password === process.env.SUPERADMIN_PASSWORD) {
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

    return res.status(400).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;