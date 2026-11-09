const sequelize = require('../config/db');

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows.length > 0;
}

async function dropColumnIfExists(table, column) {
  if (!(await tableExists(table))) return;
  const [cols] = await sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  if (!cols.length) return;

  const [fks] = await sequelize.query(
    `SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [table, column] }
  );
  for (const fk of fks) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk.name}\``);
  }
  await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  console.log(`[migration] dropped ${table}.${column}`);
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
    console.log(`[migration] dropped foreign key ${fk.name} on ${fk.tbl}`);
  }
}

module.exports = async function removeProjectTypeMigration() {
  try {
    await dropForeignKeysReferencing('project_types');
    await dropColumnIfExists('boq_titles', 'projectTypeId');
    await dropColumnIfExists('assign_shares', 'projectTypeId');
    if (await tableExists('project_types')) {
      await sequelize.query('DROP TABLE `project_types`');
      console.log('[migration] dropped table project_types');
    }
  } catch (err) {
    // Never block the server from starting because of this cleanup.
    console.error('[migration] remove Project Type failed:', err.message);
  }
};