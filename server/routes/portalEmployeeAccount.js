// server/routes/portalEmployeeAccount.js
// Mounted from portalEmployee.js at /account (portalAuth + requireRole('employee') already ran).
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const limiter = require('../utils/attemptLimiter');

router.post('/change-password', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one' });
    }

    const key = `pw:${employeeId}`;
    const wait = limiter.check(key);
    if (wait) {
      return res.status(429).json({ message: `Too many wrong attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.` });
    }

    const employee = await Employee.unscoped().findByPk(employeeId);
    if (!employee || !employee.portalPassword) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const ok = await bcrypt.compare(currentPassword, employee.portalPassword);
    if (!ok) {
      limiter.fail(key);
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    limiter.clear(key);

    employee.portalPassword = await bcrypt.hash(newPassword, 10);
    await employee.save();

    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;