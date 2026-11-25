// server/middleware/permissions.js
const { canAccessModule, canAccessAnyModule, getExplicitModules } = require('../config/permissions');

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

// Passes when the user may open ANY of the given sections. Uses the whole
// req.user (primary role + extra roles + explicit section list), not only role.
function requireModule(...moduleKeys) {
  return (req, res, next) => {
    if (!req.user || !canAccessAnyModule(req.user, moduleKeys)) {
      return res.status(403).json({ message: 'You do not have access to this module' });
    }
    next();
  };
}

// Team-member management: admins, or users explicitly granted the Settings section.
function requireUserManager(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (['superadmin', 'admin'].includes(req.user.role)) return next(); // same check as before
  const explicit = getExplicitModules(req.user);
  if (explicit && explicit.includes('settings')) return next();
  return res.status(403).json({ message: 'You do not have permission to perform this action' });
}

module.exports = { requireRole, requireAdmin, requireModule, requireUserManager, canAccessModule };