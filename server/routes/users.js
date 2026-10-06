// server/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const User = require('../models/User');
const { ROLE_PERMISSIONS } = require('../config/permissions');

// GET all users
router.get('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'ASC']],
    });

    // Ensure superadmin is always active & format booleans cleanly
    const formatted = users.map((u) => {
      const data = u.toJSON();
      if (data.role === 'superadmin') {
        data.isActive = true;
      } else {
        data.isActive = data.isActive === null || data.isActive === undefined ? true : Boolean(data.isActive);
      }
      return data;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add user
router.post('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, roles = [] } = req.body;
    if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: 'Invalid role' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      roles: Array.isArray(roles) ? roles : [],
      isActive: true, // Always active upon creation
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, roles: user.roles, isActive: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update role
router.put('/:id/role', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { role, roles } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role) {
      if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: 'Invalid role' });
      user.role = role;
    }

    if (roles !== undefined) {
      user.roles = Array.isArray(roles) ? roles : [];
    }

    await user.save();
    res.json({ id: user.id, role: user.role, roles: user.roles });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT toggle status (Activate / Deactivate) — SUPERADMIN PROTECTED
router.put('/:id/status', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Superadmin can NEVER be deactivated
    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin is always active and cannot be deactivated' });
    }

    user.isActive = Boolean(isActive);
    await user.save();
    res.json({ id: user.id, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE user
router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin cannot be deleted' });
    }
    await user.destroy();
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;