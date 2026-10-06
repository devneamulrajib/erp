// server/migrate-fund-requisition-v2.js
// Run once:  node migrate-fund-requisition-v2.js
require('dotenv').config();
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');
const FundRequisition = require('./models/FundRequisition');
const FundRequisitionPayment = require('./models/FundRequisitionPayment');

const requisitionColumns = {
  category: { type: DataTypes.STRING, allowNull: true },
  payTo: { type: DataTypes.STRING, allowNull: true },
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Normal' },
  requiredBy: { type: DataTypes.STRING, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  linkedReference: { type: DataTypes.STRING, allowNull: true },
  cancelled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cancelReason: { type: DataTypes.STRING, allowNull: true },
};

const paymentColumns = {
  reference: { type: DataTypes.STRING, allowNull: true },
  note: { type: DataTypes.STRING, allowNull: true },
};

async function addMissing(Model, columns) {
  const qi = sequelize.getQueryInterface();
  const table = Model.getTableName();
  const existing = await qi.describeTable(table);

  for (const attr of Object.keys(columns)) {
    // Respect whatever column naming the global Sequelize config uses (camelCase or underscored).
    const field = (Model.rawAttributes[attr] && Model.rawAttributes[attr].field) || attr;
    if (existing[field]) {
      console.log(`${table}.${field} already exists, skipping`);
      continue;
    }
    await qi.addColumn(table, field, columns[attr]);
    console.log(`Added ${table}.${field}`);
  }
}

async function run() {
  await addMissing(FundRequisition, requisitionColumns);
  await addMissing(FundRequisitionPayment, paymentColumns);
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });