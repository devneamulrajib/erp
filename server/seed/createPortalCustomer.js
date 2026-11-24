require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database:', sequelize.config.database);

    // Usage: PORTAL_PASSWORD=... node seed/createPortalCustomer.js [email] [password]
    // (or pass the password as the 2nd argument). No password is stored in this file.
    const email = process.argv[2] || process.env.PORTAL_EMAIL || 'portaltest@gmail.com';
    const plainPassword = process.argv[3] || process.env.PORTAL_PASSWORD;
    if (!plainPassword) {
      console.error('Missing password. Run: node seed/createPortalCustomer.js <email> <password>  (or set PORTAL_PASSWORD)');
      process.exit(1);
    }

    const existing = await Customer.findOne({ where: { email } });
    if (existing) {
      console.log(`Customer with email ${email} already exists (id: ${existing.id}). Updating password instead.`);
      existing.portalPassword = await bcrypt.hash(plainPassword, 10);
      existing.portalRole = existing.portalRole || 'customer';
      existing.createUser = true;
      await existing.save();
      console.log(`Password updated for ${email}.`);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(plainPassword, 10);
    const customer = await Customer.create({
      name: 'Portal Test Customer',
      mobile: '01700000000',
      email,
      portalPassword: hashed,
      portalRole: 'customer',
      createUser: true,
    });

    console.log('New customer created:');
    console.log(`- id: ${customer.id}`);
    console.log(`- email: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

run();