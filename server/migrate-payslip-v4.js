require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function run() {
  const qi = sequelize.getQueryInterface();
  const cols = await qi.describeTable('pay_slips');

  if (!cols.standingBreakdown) {
    await qi.addColumn('pay_slips', 'standingBreakdown', { type: DataTypes.TEXT, allowNull: true });
    console.log('Added pay_slips.standingBreakdown');
  } else {
    console.log('pay_slips.standingBreakdown already exists, skipping');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });