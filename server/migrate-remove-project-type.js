require('dotenv').config();
const sequelize = require('./config/db');

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return rows.length > 0;
}

async function dropForeignKeysForColumn(tableName, columnName) {
  const [fks] = await sequelize.query(
    `SELECT CONSTRAINT_NAME 
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName] }
  );

  for (const fk of fks) {
    try {
      console.log(`  -> Dropping FK '${fk.CONSTRAINT_NAME}' on table '${tableName}'...`);
      await sequelize.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    } catch (err) {
      console.warn(`     Warning: could not drop FK '${fk.CONSTRAINT_NAME}': ${err.message}`);
    }
  }
}

async function dropForeignKeysReferencingTable(targetTableName) {
  const [fks] = await sequelize.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME 
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ?`,
    { replacements: [targetTableName] }
  );

  for (const fk of fks) {
    try {
      console.log(`  -> Dropping FK '${fk.CONSTRAINT_NAME}' on '${fk.TABLE_NAME}' referencing '${targetTableName}'...`);
      await sequelize.query(`ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    } catch (err) {
      console.warn(`     Warning: could not drop FK '${fk.CONSTRAINT_NAME}': ${err.message}`);
    }
  }
}

async function safeDropColumn(tableName, columnName) {
  const exists = await columnExists(tableName, columnName);
  if (!exists) return;

  await dropForeignKeysForColumn(tableName, columnName);

  try {
    console.log(`  -> Dropping column '${columnName}' from '${tableName}'...`);
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    console.log(`     ✓ Column '${columnName}' removed from '${tableName}'`);
  } catch (err) {
    console.warn(`     Warning: could not drop column '${columnName}' from '${tableName}': ${err.message}`);
  }
}

async function run() {
  console.log('====================================================');
  console.log(' Starting Project Type Removal Database Migration... ');
  console.log('====================================================');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database:', process.env.DB_NAME);

    // List of tables and possible Project Type column variations
    const tablesToClean = [
      'projects',
      'sites',
      'assign_shares',
      'boq_titles',
      'bills',
      'contractor_bills',
      'contractor_workorders',
      'flat_sales',
      'material_requisitions',
      'material_usages',
      'purchase_orders',
      'purchases',
      'quotes',
      'sales',
      'service_requisitions',
      'vouchers',
      'workorders',
      'labour_bills',
      'adjustment_bills',
      'fund_requisitions',
      'contra_vouchers',
      'journal_vouchers',
      'payment_vouchers',
      'receipt_vouchers',
    ];

    const standardCols = ['project_type_id', 'projectTypeId', 'project_type', 'projectType'];

    // 1. Drop all FKs pointing to project_types or ProjectTypes
    await dropForeignKeysReferencingTable('project_types');
    await dropForeignKeysReferencingTable('ProjectTypes');

    // 2. Drop columns from all standard tables
    for (const table of tablesToClean) {
      if (await tableExists(table)) {
        for (const col of standardCols) {
          await safeDropColumn(table, col);
        }
      }
    }

    // 3. Clean stock_transfers (has from/to variations)
    if (await tableExists('stock_transfers')) {
      const stockCols = [
        'from_project_type_id', 'to_project_type_id',
        'fromProjectTypeId', 'toProjectTypeId',
        'from_project_type', 'to_project_type',
        'fromProjectType', 'toProjectType',
      ];
      for (const col of stockCols) {
        await safeDropColumn('stock_transfers', col);
      }
    }

    // 4. Drop the project_types table itself
    if (await tableExists('project_types')) {
      console.log('  -> Dropping table `project_types`...');
      await sequelize.query('DROP TABLE IF EXISTS `project_types`');
      console.log('     ✓ Table `project_types` dropped.');
    }
    if (await tableExists('ProjectTypes')) {
      console.log('  -> Dropping table `ProjectTypes`...');
      await sequelize.query('DROP TABLE IF EXISTS `ProjectTypes`');
      console.log('     ✓ Table `ProjectTypes` dropped.');
    }

    console.log('====================================================');
    console.log(' ✓ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log(' All Project Type columns and tables are cleaned.');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();