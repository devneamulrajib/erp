const jwt = require('jsonwebtoken');

// Staff (ERP user) auth — only accepts tokens issued by POST /api/auth/login.
// Portal tokens (customer/supplier/employee/investor, carrying `portal: true`)
// and salary-unlock tokens are signed with the same JWT_SECRET, so they are
// rejected here explicitly. Portal routes use middleware/portalAuth.js instead.
module.exports = function (req, res, next) {
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
  req.user = decoded;
  next();
};