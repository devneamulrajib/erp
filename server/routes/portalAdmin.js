const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Customer, Party, Employee, Investor } = require('../models/associations');
const auth = require('../middleware/auth');
const { findByPortalUsername } = require('../utils/portalFields');

/**
 * Access-control middleware fallback:
 * Accepts requests if the user has admin/superadmin role OR the 'users:manage' permission.
 */
function verifyAdminOrPermission(req, res, next) {
  const role = req.user?.role?.toLowerCase();
  const permissions = req.user?.permissions || [];

  if (role === 'admin' || role === 'superadmin' || permissions.includes('users:manage')) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access or users:manage permission required.' });
}

// Attach base authentication and permission check across all administrative routes
router.use(auth, verifyAdminOrPermission);

/**
 * Resolves the Sequelize model and default portal role from an entity type string.
 */
function resolveModelAndRole(type) {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'customer':
      return { Model: Customer, defaultRole: 'customer' };
    case 'supplier':
    case 'vendor':
    case 'party':
      return { Model: Party, defaultRole: 'supplier' };
    case 'employee':
      return { Model: Employee, defaultRole: 'employee' };
    case 'investor':
      return { Model: Investor, defaultRole: 'investor' };
    default:
      return { Model: null, defaultRole: null };
  }
}

/**
 * Sets every matching attribute name that exists on the model instance.
 * Supports snake_case (Customer/Party/Employee) and camelCase (Investor).
 */
function setFields(entity, keys, value) {
  keys.forEach((key) => {
    if (key in entity) entity[key] = value;
  });
}

/**
 * Synchronizes model properties across legacy and updated schema definitions.
 */
function syncEntityFields(entity, { enable, passwordHash, username, role }) {
  if (typeof enable === 'boolean') {
    setFields(entity, ['portal_access', 'portalAccess', 'createUser'], enable);
  }
  if (passwordHash) {
    setFields(entity, ['portal_password', 'portalPassword'], passwordHash);
  }
  if (username) {
    setFields(entity, ['portal_username', 'portalUsername'], username);
  }
  if (role) {
    setFields(entity, ['portalRole', 'portal_role'], role);
  }
}

/**
 * Reads the current portal username from either naming style.
 */
function getPortalUsername(entity) {
  return entity.portal_username || entity.portalUsername || null;
}

// =========================================================================
// 1. UNIFIED PORTAL MANAGEMENT API (Entity-driven)
// =========================================================================

// POST /api/portal-admin/create
router.post('/create', async (req, res) => {
  try {
    const { entityType, entityId, username, password, portalRole } = req.body;
    const { Model, defaultRole } = resolveModelAndRole(entityType);

    if (!Model) {
      return res.status(400).json({ message: 'Invalid or unsupported entity type.' });
    }
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Enforce uniqueness across all portal entities (skips models without the column)
    const [cMatch, pMatch, eMatch, iMatch] = await Promise.all([
      findByPortalUsername(Customer, cleanUsername),
      findByPortalUsername(Party, cleanUsername),
      findByPortalUsername(Employee.unscoped(), cleanUsername),
      findByPortalUsername(Investor, cleanUsername)
    ]);

    if (cMatch || pMatch || eMatch || iMatch) {
      return res.status(409).json({ message: 'Portal username is already taken. Please choose another.' });
    }

    const entity = await Model.findByPk(entityId);
    if (!entity) {
      return res.status(404).json({ message: `${entityType} record not found.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = portalRole || defaultRole;

    syncEntityFields(entity, {
      enable: true,
      passwordHash: hashedPassword,
      username: cleanUsername,
      role: assignedRole
    });

    await entity.save();

    return res.json({
      message: `Portal access successfully granted for ${entity.name || 'user'}.`,
      entityId: entity.id,
      username: cleanUsername,
      role: assignedRole
    });
  } catch (error) {
    console.error('Portal Admin Create Error:', error);
    return res.status(500).json({ message: 'Failed to create portal access.', error: error.message });
  }
});

// POST /api/portal-admin/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { entityType, entityId, password } = req.body;
    const { Model } = resolveModelAndRole(entityType);

    if (!Model) return res.status(400).json({ message: 'Invalid or unsupported entity type.' });
    if (!password) return res.status(400).json({ message: 'New password is required.' });

    const entity = await Model.findByPk(entityId);
    if (!entity) return res.status(404).json({ message: 'Record not found.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    syncEntityFields(entity, { passwordHash: hashedPassword });
    await entity.save();

    return res.json({ message: `Password reset successfully for ${entity.name || 'user'}.` });
  } catch (error) {
    console.error('Portal Admin Reset Password Error:', error);
    return res.status(500).json({ message: 'Failed to reset password.', error: error.message });
  }
});

// POST /api/portal-admin/toggle-access
router.post('/toggle-access', async (req, res) => {
  try {
    const { entityType, entityId, access } = req.body;
    const { Model } = resolveModelAndRole(entityType);

    if (!Model) return res.status(400).json({ message: 'Invalid or unsupported entity type.' });

    const entity = await Model.findByPk(entityId);
    if (!entity) return res.status(404).json({ message: 'Record not found.' });

    const isEnabled = Boolean(access);
    syncEntityFields(entity, { enable: isEnabled });
    await entity.save();

    return res.json({
      message: `Portal access ${isEnabled ? 'enabled' : 'disabled'} for ${entity.name || 'user'}.`,
      access: isEnabled
    });
  } catch (error) {
    console.error('Portal Admin Toggle Access Error:', error);
    return res.status(500).json({ message: 'Failed to toggle portal access.', error: error.message });
  }
});

// =========================================================================
// 2. LEGACY / DIRECT ENDPOINTS (Backwards Compatibility)
// =========================================================================

// PUT /api/portal-admin/customers/:id/access
router.put('/customers/:id/access', async (req, res) => {
  try {
    const { enable, portalRole, password } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    if (enable === false) {
      syncEntityFields(customer, { enable: false });
      await customer.save();
      return res.json({ message: 'Portal access disabled', customerId: customer.id });
    }

    if (!customer.email) {
      return res.status(400).json({ message: 'Customer must have an email set before enabling portal access.' });
    }

    const assignedRole = portalRole || 'customer';
    if (!['customer', 'supplier', 'vendor'].includes(assignedRole)) {
      return res.status(400).json({ message: 'Invalid portal role provided.' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    syncEntityFields(customer, {
      enable: true,
      role: assignedRole,
      passwordHash: hashedPassword,
      username: getPortalUsername(customer) || customer.email
    });

    await customer.save();

    return res.json({
      message: 'Portal access granted',
      customerId: customer.id,
      portalRole: assignedRole
    });
  } catch (err) {
    console.error('Portal Admin Customer Access Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/portal-admin/employees/:id/access
router.put('/employees/:id/access', async (req, res) => {
  try {
    const { enable, password } = req.body;
    const employee = await Employee.unscoped().findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    if (enable === false) {
      syncEntityFields(employee, { enable: false });
      await employee.save();
      return res.json({ message: 'Portal access disabled', employeeId: employee.id });
    }

    if (!employee.email) {
      return res.status(400).json({ message: 'Employee must have an email set before enabling portal access.' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    syncEntityFields(employee, {
      enable: true,
      role: 'employee',
      passwordHash: hashedPassword,
      username: getPortalUsername(employee) || employee.email
    });

    await employee.save();

    return res.json({
      message: 'Portal access granted',
      employeeId: employee.id
    });
  } catch (err) {
    console.error('Portal Admin Employee Access Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;