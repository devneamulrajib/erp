require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connection OK.');

    await Customer.sync({ alter: true });
    console.log('Customers table synced — portal columns added (if missing).');

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();