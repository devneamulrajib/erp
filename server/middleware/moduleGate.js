// server/middleware/moduleGate.js
// Section (module) access for the whole /api tree, mounted once in index.js.
//
// Only users with an explicit section list (Users.modules, set in
// Settings > Team Members) are checked: a call to /api/<mount> is refused with
// 403 unless the user holds one of the sections in config/moduleAccess.js.
// Admins/superadmins and users without a list (all existing users) pass through
// unchanged, and anything that is not a valid staff token is left to the
// route's own auth middleware, so public and portal endpoints are unaffected.
const jwt = require('jsonwebtoken');
const auth = require('./auth');
const { API_MODULES } = require('../config/moduleAccess');
const { canAccessAnyModule, hasExplicitModules } = require('../config/permissions');

module.exports = async function moduleGate(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const mount = `/${(req.path.split('/')[1] || '').toLowerCase()}`;
  const sections = API_MODULES[mount];
  if (!sections) return next();

  const header = req.headers.authorization;
  if (!header) return next();
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return next(); // route auth answers 401
  }
  if (!decoded || decoded.portal || decoded.salaryUnlock) return next();
  const id = Number(decoded.id);
  if (!Number.isInteger(id) || id <= 0) return next();

  let user;
  try {
    user = await auth.loadUser(id);
  } catch {
    return next(); // route auth reports the lookup problem
  }
  if (!user || user.isActive === false) return next();
  if (!hasExplicitModules(user)) return next();
  if (canAccessAnyModule(user, sections)) return next();

  return res.status(403).json({
    message: 'You do not have access to this section',
    requiredAnyOf: sections,
  });
};
