require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const ChartOfAccount = require('../models/ChartOfAccount');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database:', sequelize.config.database);

    // sync({ alter: true }) re-adds every foreign key/unique index each run,
    // which is how the database collected thousands of duplicate keys.
    // Off unless explicitly enabled: ALLOW_SYNC_ALTER=1 node seed/syncChartOfAccountTable.js
    if (process.env.ALLOW_SYNC_ALTER !== '1') {
      console.log('Skipped: set ALLOW_SYNC_ALTER=1 to run sync({ alter: true }). Prefer an explicit migrate-*.js script.');
      process.exit(0);
    }
    await ChartOfAccount.sync({ alter: true });
    console.log('ChartOfAccounts table synced — portal columns added.');

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();