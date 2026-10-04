// server/migrate-payslip-v3.js
require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function run() {
  const qi = sequelize.getQueryInterface();
  const cols = await qi.describeTable('pay_slips');

  if (!cols.officeExpenseId) {
    await qi.addColumn('pay_slips', 'officeExpenseId', { type: DataTypes.INTEGER, allowNull: true });
    console.log('Added pay_slips.officeExpenseId');
  } else {
    console.log('pay_slips.officeExpenseId already exists, skipping');
  }

  if (!cols.budgetCategoryId) {
    await qi.addColumn('pay_slips', 'budgetCategoryId', { type: DataTypes.INTEGER, allowNull: true });
    console.log('Added pay_slips.budgetCategoryId');
  } else {
    console.log('pay_slips.budgetCategoryId already exists, skipping');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });