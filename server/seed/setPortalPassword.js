require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  await sequelize.authenticate();

  // Usage: node seed/setPortalPassword.js <customer-email> <password>
  // (or set PORTAL_EMAIL / PORTAL_PASSWORD). No password is stored in this file.
  const email = process.argv[2] || process.env.PORTAL_EMAIL;
  const plainPassword = process.argv[3] || process.env.PORTAL_PASSWORD;
  if (!email || !plainPassword) {
    console.error('Missing email or password. Run: node seed/setPortalPassword.js <customer-email> <password>  (or set PORTAL_EMAIL / PORTAL_PASSWORD)');
    process.exit(1);
  }

  const customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    console.log(`No customer found with email ${email}`);
    process.exit(1);
  }

  customer.portalPassword = await bcrypt.hash(plainPassword, 10);
  customer.portalRole = customer.portalRole || 'customer';
  customer.createUser = true; // enable portal access
  await customer.save();

  console.log(`Portal password set for ${email}.`);
  process.exit(0);
}

run();