require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const PurchaseOrder = require('../models/PurchaseOrder');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database:', sequelize.config.database);

    await PurchaseOrder.sync({ alter: true });
    console.log('PurchaseOrders table synced — missing columns added.');

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();