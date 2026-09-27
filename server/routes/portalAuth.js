const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ChartOfAccount = require('../models/ChartOfAccount');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await ChartOfAccount.findOne({ where: { email } });

    if (!customer || !customer.portalPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, customer.portalPassword);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!customer.createUser) {
      return res.status(403).json({ message: 'Portal access not enabled for this account' });
    }

    const token = jwt.sign(
      {
        portal: true,
        customerId: customer.id,
        role: customer.portalRole || 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    customer.lastPortalLoginAt = new Date();
    await customer.save();

    res.json({
      token,
      user: { id: customer.id, name: customer.name, email: customer.email, role: customer.portalRole },
    });
  } catch (err) {
    console.error('Portal login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;