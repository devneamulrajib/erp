// server/migrate-budget-cash-receipt.js
// Run once: node migrate-budget-cash-receipt.js
// Creates the MonthlyBudgetCashReceipts table if it doesn't already exist.
// Safe to run multiple times — sync() with no `force`/`alter` only creates
// missing tables, it never drops or rewrites existing ones.
const sequelize = require('./config/db');
const MonthlyBudgetCashReceipt = require('./models/MonthlyBudgetCashReceipt');

async function run() {
  try {
    await MonthlyBudgetCashReceipt.sync();
    console.log('MonthlyBudgetCashReceipts table is ready.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();