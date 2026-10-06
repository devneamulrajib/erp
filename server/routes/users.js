// server/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const User = require('../models/User');
const sequelize = require('../config/db');
const { ROLE_PERMISSIONS } = require('../config/permissions');

// AUTO-MIGRATION: Self-heal the database on live server if columns are missing
(async function autoMigrate() {
  try {
    await sequelize.query('ALTER TABLE Users ADD COLUMN roles TEXT NULL');
    console.log('✅ Auto-migrated: added "roles" column to Users table.');
  } catch (err) {
    // Ignore if column already exists
  }
  try {
    await sequelize.query('ALTER TABLE Users ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1');
  } catch (err) {
    // Ignore if column already exists
  }
  try {
    // Ensure all existing users are activated
    await sequelize.query('UPDATE Users SET isActive = 1 WHERE isActive IS NULL OR isActive = 0');
  } catch (err) {
    // Ignore if fails
  }
})();

// GET all users
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
      isActive: true,
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

    const updateFields = {};
    if (role) {
      if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: 'Invalid role' });
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

// PUT toggle status (Activate / Deactivate) — targeted update that will not crash
router.put('/:id/status', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin is always active and cannot be deactivated' });
    }

    // Direct column update avoids touching any unmigrated columns
    await User.update({ isActive: Boolean(isActive) }, { where: { id: req.params.id } });
    res.json({ id: user.id, isActive: Boolean(isActive) });
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
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;