require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const ChartOfAccount = require('../models/ChartOfAccount');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database:', sequelize.config.database);

    await ChartOfAccount.sync({ alter: true });
    console.log('ChartOfAccounts table synced — portal columns added.');

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();