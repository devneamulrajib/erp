// server/migrate-fund-requisition-v3.js
// Run once:  node migrate-fund-requisition-v3.js
require('dotenv').config();
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');
const FundRequisition = require('./models/FundRequisition');

const columns = {
  rejected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  rejectReason: { type: DataTypes.STRING, allowNull: true },
  approvalNote: { type: DataTypes.TEXT, allowNull: true },
};

async function run() {
  const qi = sequelize.getQueryInterface();
  const table = FundRequisition.getTableName();
  const existing = await qi.describeTable(table);

  for (const attr of Object.keys(columns)) {
    const field = (FundRequisition.rawAttributes[attr] && FundRequisition.rawAttributes[attr].field) || attr;
    if (existing[field]) {
      console.log(`${table}.${field} already exists, skipping`);
      continue;
    }
    await qi.addColumn(table, field, columns[attr]);
    console.log(`Added ${table}.${field}`);
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });