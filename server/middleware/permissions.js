const { canAccessModule } = require('../config/permissions');

// Use after your existing `auth` middleware (req.user must already be set).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };
}

function requireModule(moduleKey) {
  return (req, res, next) => {
    if (!req.user || !canAccessModule(req.user.role, moduleKey)) {
      return res.status(403).json({ message: 'You do not have access to this module' });
    }
    next();
  };
}

module.exports = { requireRole, requireModule };