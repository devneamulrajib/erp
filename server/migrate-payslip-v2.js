// server/migrate-payslip-v2.js
require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function run() {
  const qi = sequelize.getQueryInterface();

  const deductionCols = await qi.describeTable('salary_deductions');
  if (!deductionCols.type) {
    await qi.addColumn('salary_deductions', 'type', {
      type: DataTypes.ENUM('Deduction', 'Addition'),
      allowNull: false,
      defaultValue: 'Deduction',
    });
    console.log('Added salary_deductions.type');
  } else {
    console.log('salary_deductions.type already exists, skipping');
  }

  const slipCols = await qi.describeTable('pay_slips');
  if (!slipCols.otherAddition) {
    await qi.addColumn('pay_slips', 'otherAddition', {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    });
    console.log('Added pay_slips.otherAddition');
  } else {
    console.log('pay_slips.otherAddition already exists, skipping');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });