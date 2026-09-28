const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ChartOfAccount = require('../models/ChartOfAccount');
const Employee = require('../models/Employee');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try Customer/Supplier/Vendor accounts first
    const customer = await ChartOfAccount.findOne({ where: { email } });
    if (customer && customer.portalPassword) {
      const match = await bcrypt.compare(password, customer.portalPassword);
      if (match) {
        if (!customer.createUser) {
          return res.status(403).json({ message: 'Portal access not enabled for this account' });
        }
        const token = jwt.sign(
          { portal: true, customerId: customer.id, role: customer.portalRole || 'customer' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        customer.lastPortalLoginAt = new Date();
        await customer.save();
        return res.json({
          token,
          user: { id: customer.id, name: customer.name, email: customer.email, role: customer.portalRole },
        });
      }
    }

    // Fall back to Employee accounts
    const employee = await Employee.unscoped().findOne({ where: { email } });
    if (employee && employee.portalPassword) {
      const match = await bcrypt.compare(password, employee.portalPassword);
      if (match) {
        if (!employee.createUser) {
          return res.status(403).json({ message: 'Portal access not enabled for this account' });
        }
        const token = jwt.sign(
          { portal: true, customerId: employee.id, role: employee.portalRole || 'employee' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        employee.lastPortalLoginAt = new Date();
        await employee.save();
        return res.json({
          token,
          user: { id: employee.id, name: employee.name, email: employee.email, role: employee.portalRole || 'employee' },
        });
      }
    }

    return res.status(400).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error('Portal login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;