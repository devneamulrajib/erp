const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Models
const { Customer, Party, Employee, Investor } = require('../models/associations');
// Middleware & Utilities
const { portalAuth } = require('../middleware/portalAuth'); // named export
const limiter = require('../utils/attemptLimiter'); // exports: check, fail, clear
const { findForLogin } = require('../utils/portalFields');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not defined.');
}

/**
 * Reads portal fields from an instance regardless of naming style.
 */
function readPortalFields(user) {
  return {
    passwordHash: user.portal_password || user.portalPassword || null,
    username: user.portal_username || user.portalUsername || null,
    access: user.portal_access ?? user.portalAccess ?? user.createUser ?? true
  };
}

/**
 * Updates the last-login timestamp, saving only that one field.
 */
async function touchLastLogin(user) {
  const now = new Date();
  let field = null;

  if ('portal_last_login' in user) field = 'portal_last_login';
  else if ('portalLastLogin' in user) field = 'portalLastLogin';
  else if ('lastPortalLoginAt' in user) field = 'lastPortalLoginAt';

  if (!field) return;

  user[field] = now;
  await user.save({ fields: [field], validate: false });
}

// ==========================================
// POST /login - Portal Multi-Role Login
// ==========================================
router.post('/login', async (req, res) => {
  try {
    // Accept either username or email as the login credential
    const identifier = (req.body.username || req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    // IP Rate Limiting Check (check() returns minutes remaining, or 0 if not locked)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
    const key = `portal:${ip}`;
    const minutesLeft = limiter.check(key);
    if (minutesLeft > 0) {
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    let user = null;
    let role = null;

    // 1. Check Customer
    user = await findForLogin(Customer, identifier);
    if (user) {
      role = user.portalRole || 'customer';
    }

    // 2. Check Supplier / Party
    if (!user) {
      user = await findForLogin(Party, identifier);
      if (user) {
        role = user.portalRole || 'supplier';
      }
    }

    // 3. Check Employee (unscoped to bypass default soft-delete or active scopes)
    if (!user) {
      user = await findForLogin(Employee.unscoped(), identifier);
      if (user) {
        role = user.portalRole || 'employee';
      }
    }

    // 4. Check Investor
    if (!user) {
      user = await findForLogin(Investor, identifier);
      if (user) {
        role = 'investor';
      }
    }

    const fields = user ? readPortalFields(user) : null;

    // Check if user exists and has a configured portal password
    if (!user || !fields.passwordHash) {
      limiter.fail(key);
      return res.status(401).json({ message: 'Invalid credentials or portal access disabled.' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, fields.passwordHash);
    if (!isMatch) {
      limiter.fail(key);
      return res.status(401).json({ message: 'Invalid credentials or portal access disabled.' });
    }

    // Verify Access Permissions
    if (!fields.access) {
      return res.status(403).json({ message: 'Portal access is not enabled for this account.' });
    }

    // Login Successful - Reset rate limiter
    limiter.clear(key);

    // Update Last Login Timestamp
    await touchLastLogin(user);

    // Payload standardization
    const username = fields.username || user.email;
    const payload = {
      portal: true,
      id: user.id,
      customerId: user.id, // Backwards-compatibility
      role,
      username,
      name: user.name,
      email: user.email || ''
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        role,
        username,
        name: user.name,
        email: user.email || ''
      }
    });

  } catch (error) {
    console.error('Portal Login Error:', error);
    return res.status(500).json({ message: 'Authentication server error.', error: error.message });
  }
});

// ==========================================
// GET /me - Session Verification Route
// ==========================================
router.get('/me', portalAuth, async (req, res) => {
  try {
    const id = req.portalUser.id || req.portalUser.customerId;
    const role = req.portalUser.role;

    // Returns only the attributes a model actually has
    const pick = (Model, wanted) => {
      const attrs = Model.rawAttributes || {};
      return wanted.filter((a) => a in attrs);
    };

    const common = ['id', 'name', 'phone', 'email', 'portal_username', 'portal_last_login'];
    let user = null;

    switch (role) {
      case 'customer':
        user = await Customer.findByPk(id, { attributes: pick(Customer, common) });
        break;

      case 'supplier':
        user = await Party.findByPk(id, { attributes: pick(Party, common) });
        break;

      case 'employee': {
        const Emp = Employee.unscoped();
        user = await Emp.findByPk(id, {
          attributes: pick(Employee, [...common, 'designation', 'department'])
        });
        break;
      }

      case 'investor': {
        const investor = await Investor.findByPk(id, {
          attributes: ['id', 'name', 'phone', 'email', 'portalUsername', 'portalLastLogin', 'status']
        });
        if (!investor) {
          return res.status(404).json({ message: 'User record not found.' });
        }
        // Normalize to the same field names the other roles return
        const data = investor.toJSON();
        return res.json({
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          portal_username: data.portalUsername,
          portal_last_login: data.portalLastLogin,
          status: data.status,
          role
        });
      }

      default:
        return res.status(400).json({ message: 'Unknown portal role.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    return res.json({ ...user.toJSON(), role });

  } catch (error) {
    console.error('Portal Verify Me Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve session user.', error: error.message });
  }
});

module.exports = router;