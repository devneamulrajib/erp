require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  await sequelize.authenticate();

  const email = 'admin@gmail.com'; // change to a real customer email
  const plainPassword = 'Test1234!';

  const customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    console.log(`No customer found with email ${email}`);
    process.exit(1);
  }

  customer.portalPassword = await bcrypt.hash(plainPassword, 10);
  customer.portalRole = customer.portalRole || 'customer';
  customer.createUser = true; // enable portal access
  await customer.save();

  console.log(`Portal password set for ${email}: ${plainPassword}`);
  process.exit(0);
}

run();