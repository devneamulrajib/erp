const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const ChartOfAccount = require('../models/ChartOfAccount');
const Employee = require('../models/Employee');

router.put('/customers/:id/access', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { enable, portalRole, password } = req.body;
    const customer = await ChartOfAccount.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (portalRole && !['customer', 'supplier', 'vendor'].includes(portalRole)) {
      return res.status(400).json({ message: 'Invalid portal role' });
    }

    if (enable === false) {
      customer.createUser = false;
      await customer.save();
      return res.json({ message: 'Portal access disabled', customerId: customer.id });
    }

    if (!customer.email) {
      return res.status(400).json({ message: 'Customer must have an email set before enabling portal access' });
    }
    if (!portalRole) {
      return res.status(400).json({ message: 'portalRole is required to enable portal access' });
    }

    customer.createUser = true;
    customer.portalRole = portalRole;
    if (password) {
      customer.portalPassword = await bcrypt.hash(password, 10);
    }
    await customer.save();

    res.json({ message: 'Portal access granted', customerId: customer.id, portalRole: customer.portalRole });
  } catch (err) {
    console.error('Portal admin error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Employee portal access — mirrors the customer endpoint above.
router.put('/employees/:id/access', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { enable, password } = req.body;
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (enable === false) {
      employee.createUser = false;
      await employee.save();
      return res.json({ message: 'Portal access disabled', employeeId: employee.id });
    }

    if (!employee.email) {
      return res.status(400).json({ message: 'Employee must have an email set before enabling portal access' });
    }

    employee.createUser = true;
    employee.portalRole = 'employee';
    if (password) {
      employee.portalPassword = await bcrypt.hash(password, 10);
    }
    await employee.save();

    res.json({ message: 'Portal access granted', employeeId: employee.id });
  } catch (err) {
    console.error('Portal admin error (employee):', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;