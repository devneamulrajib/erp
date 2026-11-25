const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getModulesFor } = require('../utils/userModules');

// Staff (ERP user) auth — only accepts tokens issued by POST /api/auth/login.
// Portal tokens (customer/supplier/employee/investor, carrying `portal: true`)
// and salary-unlock tokens are signed with the same JWT_SECRET, so they are
// rejected here explicitly. Portal routes use middleware/portalAuth.js instead.
//
// Every request also checks the user row (one primary-key lookup, cached for a
// few seconds) so a deactivated or deleted user is logged out right away and
// the role always comes from the database, not from the 7-day token.
const CACHE_MS = 10 * 1000;
const userCache = new Map(); // id -> { at, user }

async function loadUser(id) {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.user;
  const row = await User.findByPk(id, { attributes: ['id', 'name', 'email', 'role', 'roles', 'isActive'] });
  const user = row ? row.get({ plain: true }) : null;
  if (user) {
    user.roles = Array.isArray(row.roles) ? row.roles : [];
    // Explicit ERP section list (Settings > Team Members), null = role defaults.
    user.modules = await getModulesFor(id);
  }
  userCache.set(id, { at: Date.now(), user });
  if (userCache.size > 5000) userCache.clear();
  return user;
}

module.exports = async function (req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (decoded.portal || decoded.salaryUnlock) {
    return res.status(403).json({ message: 'Portal accounts cannot access the ERP API' });
  }
  if (!decoded.id || !decoded.role) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  // Only real DB users have numeric ids (the old 'temp-superadmin' token is refused).
  const id = Number(decoded.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
  let user;
  try {
    user = await loadUser(id);
  } catch (err) {
    console.error('auth: user lookup failed:', err.message);
    return res.status(503).json({ message: 'Server busy, please try again' });
  }
  if (!user) return res.status(401).json({ message: 'User not found' });
  if (user.isActive === false) {
    return res.status(401).json({ message: 'This account has been deactivated' });
  }
  req.user = {
    ...decoded,
    id: user.id,
    role: user.role,
    roles: user.roles || [],
    modules: user.modules || null,
    name: user.name,
    email: user.email,
  };
  next();
};

module.exports.loadUser = loadUser;
module.exports.clearUserCache = (id) => (id === undefined ? userCache.clear() : userCache.delete(Number(id)));