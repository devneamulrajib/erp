// server/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const User = require('../models/User');
const sequelize = require('../config/db');
const { ROLE_PERMISSIONS } = require('../config/permissions');

// ============================================================
// AUTO-MIGRATION: Self-heal the database on boot
// Checks both 'Users' and 'users' for cross-platform case-safety
// ============================================================
(async function autoMigrate() {
  const tableNames = ['Users', 'users'];

  for (const table of tableNames) {
    try {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN roles TEXT NULL`);
    } catch (err) {
      // Column already exists or table name doesn't match this casing
    }

    try {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1`);
    } catch (err) {
      // Column already exists or table name doesn't match this casing
    }

    try {
      await sequelize.query(`UPDATE ${table} SET isActive = 1 WHERE isActive IS NULL OR isActive = 0`);
    } catch (err) {
      // Table does not match this casing or update not needed
    }
  }
})();

// ============================================================
// GET ALL USERS
// ============================================================
router.get('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'ASC']],
    });

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

// ============================================================
// CREATE NEW USER
// ============================================================
router.post('/', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, roles = [] } = req.body;

    if (!ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      roles: Array.isArray(roles) ? roles : [],
      isActive: true,
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles,
      isActive: true,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// UPDATE USER ROLE & PERMISSION ROLES
// ============================================================
router.put('/:id/role', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { role, roles } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateFields = {};
    if (role) {
      if (!ROLE_PERMISSIONS[role]) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      updateFields.role = role;
    }

    if (roles !== undefined) {
      updateFields.roles = Array.isArray(roles) ? roles : [];
    }

    await User.update(updateFields, { where: { id: req.params.id } });
    const updated = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// TOGGLE USER STATUS (ACTIVATE / DEACTIVATE)
// ============================================================
router.put('/:id/status', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin is always active and cannot be deactivated' });
    }

    await User.update({ isActive: Boolean(isActive) }, { where: { id: req.params.id } });
    res.json({ id: user.id, isActive: Boolean(isActive) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// DELETE USER
// ============================================================
router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin cannot be deleted' });
    }

    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;