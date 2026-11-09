const sequelize = require('./config/db');
require('./models/associations'); // registers models (used only for the optional step)

// Set to true ONLY if you also want to erase the old text "projectType"
// columns on every module. Leaving it false is harmless: the columns just
// sit unused in MySQL.
const DROP_LEGACY_TEXT_COLUMNS = false;

const LEGACY_COLUMNS = {
  AdjustmentBill: ['projectType'], Bill: ['projectType'], ContractorBill: ['projectType'],
  ContractorWorkorder: ['projectType'], ContraVoucher: ['projectType'], FlatSale: ['projectType'],
  FundRequisition: ['projectType'], JournalVoucher: ['projectType'], LabourBill: ['projectType'],
  MaterialRequisition: ['projectType'], MaterialUsage: ['projectType'], PaymentVoucher: ['projectType'],
  Project: ['projectType'], Purchase: ['projectType'], PurchaseOrder: ['projectType'],
  Quote: ['projectType'], ReceiptVoucher: ['projectType'], Sale: ['projectType'],
  ServiceRequisition: ['projectType'], StockTransfer: ['fromProjectType', 'toProjectType'],
  Site: ['projectTypeName'], Voucher: ['projectType'], Workorder: ['projectType'],
};

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows.length > 0;
}

async function dropColumnIfExists(table, column) {
  if (!(await tableExists(table))) { console.log(`- table ${table} not found, skipping`); return; }
  const [cols] = await sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  if (!cols.length) { console.log(`- ${table}.${column} not found, skipping`); return; }

  const [fks] = await sequelize.query(
    `SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [table, column] }
  );
  for (const fk of fks) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk.name}\``);
    console.log(`- dropped foreign key ${fk.name} on ${table}`);
  }
  await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  console.log(`- dropped column ${table}.${column}`);
}

async function dropForeignKeysReferencing(refTable) {
  const [fks] = await sequelize.query(
    `SELECT DISTINCT TABLE_NAME AS tbl, CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ?`,
    { replacements: [refTable] }
  );
  for (const fk of fks) {
    await sequelize.query(`ALTER TABLE \`${fk.tbl}\` DROP FOREIGN KEY \`${fk.name}\``);
    console.log(`- dropped foreign key ${fk.name} on ${fk.tbl} (referenced ${refTable})`);
  }
}

(async () => {
  try {
    console.log('1) Dropping foreign keys that point at project_types');
    await dropForeignKeysReferencing('project_types');

    console.log('2) Dropping projectTypeId columns');
    await dropColumnIfExists('boq_titles', 'projectTypeId');
    await dropColumnIfExists('assign_shares', 'projectTypeId');

    console.log('3) Dropping project_types table');
    await sequelize.query('DROP TABLE IF EXISTS `project_types`');
    console.log('- project_types dropped');

    if (DROP_LEGACY_TEXT_COLUMNS) {
      console.log('4) Dropping legacy text columns');
      for (const [modelName, columns] of Object.entries(LEGACY_COLUMNS)) {
        const model = sequelize.models[modelName];
        if (!model) { console.log(`- model ${modelName} not found, skipping`); continue; }
        const table = model.getTableName();
        for (const col of columns) await dropColumnIfExists(String(table), col);
      }
    } else {
      console.log('4) Legacy text columns left in place (DROP_LEGACY_TEXT_COLUMNS = false)');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();