require('dotenv').config();
const sequelize = require('./config/db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

async function run() {
  try {
    const table = 'MonthlyBudgets';

    const columns = [
      { name: 'status', sql: "ALTER TABLE `MonthlyBudgets` ADD COLUMN `status` VARCHAR(20) DEFAULT 'Approved'" },
      { name: 'requestedAmount', sql: "ALTER TABLE `MonthlyBudgets` ADD COLUMN `requestedAmount` FLOAT DEFAULT NULL" },
      { name: 'requestedBy', sql: "ALTER TABLE `MonthlyBudgets` ADD COLUMN `requestedBy` VARCHAR(255) DEFAULT NULL" },
      { name: 'approvedBy', sql: "ALTER TABLE `MonthlyBudgets` ADD COLUMN `approvedBy` VARCHAR(255) DEFAULT NULL" },
      { name: 'approvedAt', sql: "ALTER TABLE `MonthlyBudgets` ADD COLUMN `approvedAt` DATETIME DEFAULT NULL" }
    ];

    for (const col of columns) {
      if (await columnExists(table, col.name)) {
        console.log(`Skip ${col.name} (already exists)`);
      } else {
        await sequelize.query(col.sql);
        console.log(`Added column ${col.name}`);
      }
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

run();