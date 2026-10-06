// Run from the server/ folder:  node migrate-service-requisition-v2.js
//
// Brings the ServiceRequisitions table in line with models/ServiceRequisition.js.
// Safe to run more than once: it only adds columns that are missing.
// This is also what fixes:  Unknown column 'ServiceRequisition.supplierId'
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

const TABLE = 'ServiceRequisitions';

const COLUMNS = {
  supplierId: { type: DataTypes.INTEGER, allowNull: true },
  requiredByDate: { type: DataTypes.STRING, allowNull: true },
  priority: { type: DataTypes.STRING, allowNull: true, defaultValue: 'normal' },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  discount: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
  vatPercent: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
  // Rows that already exist were all sent for approval, so default to 'submitted'.
  status: { type: DataTypes.STRING, allowNull: true, defaultValue: 'submitted' },
};

async function migrate() {
  const qi = sequelize.getQueryInterface();

  let existing;
  try {
    existing = await qi.describeTable(TABLE);
  } catch (err) {
    console.error(
      `Could not find table "${TABLE}". Run  node check-table-names.js  to see the real name, then change TABLE at the top of this file.`,
    );
    process.exit(1);
  }

  for (const [name, definition] of Object.entries(COLUMNS)) {
    if (existing[name]) {
      console.log(`- ${name}: already exists, skipped`);
      continue;
    }
    await qi.addColumn(TABLE, name, definition);
    console.log(`+ ${name}: added`);
  }

  // attachment used to be VARCHAR(255) holding one file name.
  // It now holds a JSON list of names, so widen it to TEXT.
  await sequelize.query(`ALTER TABLE \`${TABLE}\` MODIFY \`attachment\` TEXT NULL`);
  console.log('~ attachment: widened to TEXT');

  console.log('Migration finished.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});