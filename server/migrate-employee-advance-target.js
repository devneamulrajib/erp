require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function run() {
  const qi = sequelize.getQueryInterface();
  const cols = await qi.describeTable('employee_advances');

  if (!cols.targetMonth) {
    await qi.addColumn('employee_advances', 'targetMonth', { type: DataTypes.INTEGER, allowNull: true });
    console.log('Added employee_advances.targetMonth');
  } else {
    console.log('employee_advances.targetMonth already exists, skipping');
  }

  if (!cols.targetYear) {
    await qi.addColumn('employee_advances', 'targetYear', { type: DataTypes.INTEGER, allowNull: true });
    console.log('Added employee_advances.targetYear');
  } else {
    console.log('employee_advances.targetYear already exists, skipping');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });