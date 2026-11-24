require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connection OK.');

    // sync({ alter: true }) re-adds every foreign key/unique index each run,
    // which is how the database collected thousands of duplicate keys.
    // Off unless explicitly enabled: ALLOW_SYNC_ALTER=1 node seed/syncCustomerTable.js
    if (process.env.ALLOW_SYNC_ALTER !== '1') {
      console.log('Skipped: set ALLOW_SYNC_ALTER=1 to run sync({ alter: true }). Prefer an explicit migrate-*.js script.');
      process.exit(0);
    }
    await Customer.sync({ alter: true });
    console.log('Customers table synced — portal columns added (if missing).');

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();