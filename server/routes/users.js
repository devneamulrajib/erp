const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const User = require('../models/User');
const { ROLE_PERMISSIONS } = require('../config/permissions');

router.get('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: 'Invalid role' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id/role', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = role;
    await user.save();
    res.json({ id: user.id, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id/status', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = isActive;
    await user.save();
    res.json({ id: user.id, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;