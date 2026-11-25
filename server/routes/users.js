// server/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireUserManager } = require('../middleware/permissions');
const User = require('../models/User');
const sequelize = require('../config/db');
const { ROLE_PERMISSIONS, MODULE_KEYS, normalizeModules } = require('../config/permissions');
const { getModulesMap, setModulesFor } = require('../utils/userModules');

// Team Members can be managed by admins, or by users explicitly granted the
// Settings section. Those non-admin managers cannot touch admin accounts,
// cannot hand out admin roles or the Settings section, and cannot change
// their own access.
const ADMIN_ROLES = ['superadmin', 'admin'];
const hasAdminRole = (role, roles) =>
  ADMIN_ROLES.includes(role) || (Array.isArray(roles) && roles.some((r) => ADMIN_ROLES.includes(r)));

function managerBlock(req, { target = null, role, roles, modules } = {}) {
  if (ADMIN_ROLES.includes(req.user.role)) return null;
  if (hasAdminRole(role, roles)) return 'Only an admin can grant admin roles';
  if (target && hasAdminRole(target.role, target.roles)) return 'Only an admin can change an admin account';
  if (target && Number(target.id) === Number(req.user.id)) return 'You cannot change your own access';
  if (Array.isArray(modules) && modules.includes('settings')) return 'Only an admin can grant the Settings section';
  return null;
}

// Body `modules`: undefined = leave as is, null/[] = role defaults,
// array of section keys = explicit list. Returns { value } or { error }.
function readModules(raw) {
  if (raw === undefined) return { value: undefined };
  if (raw === null || (Array.isArray(raw) && raw.length === 0)) return { value: null };
  if (!Array.isArray(raw)) return { error: 'modules must be a list of section keys' };
  const bad = raw.filter((k) => !MODULE_KEYS.includes(k));
  if (bad.length) return { error: `Unknown section(s): ${bad.join(', ')}` };
  return { value: normalizeModules(raw) };
}

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

    // Only backfill missing values. Never touch isActive = 0 — that would
    // re-activate every deactivated user each time the server restarts.
    try {
      await sequelize.query(`UPDATE ${table} SET isActive = 1 WHERE isActive IS NULL`);
    } catch (err) {
      // Table does not match this casing or update not needed
    }
  }
})();

// ============================================================
// GET ALL USERS
// ============================================================
router.get('/', auth, requireUserManager, async (req, res) => {
  try {
    const [users, modulesById] = await Promise.all([
      User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'ASC']],
      }),
      getModulesMap(),
    ]);

    const formatted = users.map((u) => {
      const data = u.toJSON();
      if (data.role === 'superadmin') {
        data.isActive = true;
      } else {
        data.isActive = data.isActive === null || data.isActive === undefined ? true : Boolean(data.isActive);
      }
      data.modules = modulesById[data.id] || null; // null = role-based access
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
router.post('/', auth, requireUserManager, async (req, res) => {
  try {
    const { name, email, password, role, roles = [] } = req.body;

    if (!ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can create a superadmin' });
    }
    const mods = readModules(req.body.modules);
    if (mods.error) return res.status(400).json({ message: mods.error });
    const blocked = managerBlock(req, { role, roles, modules: mods.value });
    if (blocked) return res.status(403).json({ message: blocked });

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

    if (mods.value) {
      try {
        await setModulesFor(user.id, mods.value);
      } catch (e) {
        // Don't leave a user behind with more access than was asked for.
        await User.destroy({ where: { id: user.id } });
        return res.status(e.status || 500).json({ message: e.message });
      }
    }

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles,
      modules: mods.value || null,
      isActive: true,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// UPDATE USER ROLE & PERMISSION ROLES
// ============================================================
router.put('/:id/role', auth, requireUserManager, async (req, res) => {
  try {
    const { role, roles } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Admins cannot promote anyone to superadmin or change a superadmin's roles.
    if (req.user.role !== 'superadmin' && (role === 'superadmin' || user.role === 'superadmin')) {
      return res.status(403).json({ message: 'Only a superadmin can change superadmin roles' });
    }
    const blockedRole = managerBlock(req, { target: user, role, roles });
    if (blockedRole) return res.status(403).json({ message: blockedRole });

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
    auth.clearUserCache(req.params.id); // new role applies on the next request
    const updated = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// UPDATE SECTION ACCESS (explicit ERP sections, or null = role defaults)
// ============================================================
router.put('/:id/access', auth, requireUserManager, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const mods = readModules(req.body.modules === undefined ? null : req.body.modules);
    if (mods.error) return res.status(400).json({ message: mods.error });
    const blocked = managerBlock(req, { target: user, modules: mods.value });
    if (blocked) return res.status(403).json({ message: blocked });

    await setModulesFor(user.id, mods.value);
    auth.clearUserCache(user.id); // applies on the user's next request
    res.json({ id: user.id, modules: mods.value || null });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error', error: err.message });
  }
});

// ============================================================
// TOGGLE USER STATUS (ACTIVATE / DEACTIVATE)
// ============================================================
router.put('/:id/status', auth, requireUserManager, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin is always active and cannot be deactivated' });
    }
    const blockedStatus = managerBlock(req, { target: user });
    if (blockedStatus) return res.status(403).json({ message: blockedStatus });

    await User.update({ isActive: Boolean(isActive) }, { where: { id: req.params.id } });
    auth.clearUserCache(req.params.id); // deactivation logs the user out right away
    res.json({ id: user.id, isActive: Boolean(isActive) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================================
// DELETE USER
// ============================================================
router.delete('/:id', auth, requireUserManager, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'Superadmin cannot be deleted' });
    }
    const blockedDelete = managerBlock(req, { target: user });
    if (blockedDelete) return res.status(403).json({ message: blockedDelete });

    await User.destroy({ where: { id: req.params.id } });
    auth.clearUserCache(req.params.id);
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;