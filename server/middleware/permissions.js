// server/middleware/permissions.js
const { canAccessModule } = require('../config/permissions');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user || !['superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin approval authority required' });
  }
  next();
}

function requireModule(moduleKey) {
  return (req, res, next) => {
    if (!req.user || !canAccessModule(req.user.role, moduleKey)) {
      return res.status(403).json({ message: 'You do not have access to this module' });
    }
    next();
  };
}

module.exports = { requireRole, requireAdmin, requireModule };