const jwt = require('jsonwebtoken');

// Verifies a PORTAL token specifically — rejects ERP employee/admin tokens
// even if they happen to be valid JWTs, because they won't carry `portal: true`.
function portalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.portal || !decoded.customerId || !decoded.role) {
      return res.status(401).json({ message: 'Invalid portal token' });
    }
    req.portalUser = {
      customerId: decoded.customerId,
      role: decoded.role, // 'customer' | 'supplier' | 'vendor'
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Restricts a route to specific portal roles, e.g. requireRole('supplier','vendor')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.portalUser || !roles.includes(req.portalUser.role)) {
      return res.status(403).json({ message: 'Not authorized for this role' });
    }
    next();
  };
}

module.exports = { portalAuth, requireRole };