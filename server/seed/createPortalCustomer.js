require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database:', sequelize.config.database);

    const email = 'portaltest@gmail.com'; // change if you want
    const plainPassword = 'Test1234!';

    const existing = await Customer.findOne({ where: { email } });
    if (existing) {
      console.log(`Customer with email ${email} already exists (id: ${existing.id}). Updating password instead.`);
      existing.portalPassword = await bcrypt.hash(plainPassword, 10);
      existing.portalRole = existing.portalRole || 'customer';
      existing.createUser = true;
      await existing.save();
      console.log(`Password updated for ${email}: ${plainPassword}`);
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
    console.log(`- password: ${plainPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

run();