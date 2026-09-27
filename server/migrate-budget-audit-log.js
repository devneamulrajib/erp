require('dotenv').config();
const sequelize = require('./config/db');

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows[0].cnt > 0;
}

async function run() {
  try {
    if (await tableExists('MonthlyBudgetAuditLogs')) {
      console.log('Skip MonthlyBudgetAuditLogs (already exists)');
    } else {
      await sequelize.query(`
        CREATE TABLE \`MonthlyBudgetAuditLogs\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`monthlyBudgetId\` INT NULL,
          \`budgetCategoryId\` INT NOT NULL,
          \`year\` INT NOT NULL,
          \`month\` INT NOT NULL,
          \`action\` ENUM('Created','Updated','Deleted') NOT NULL,
          \`previousAmount\` FLOAT NULL,
          \`newAmount\` FLOAT NULL,
          \`note\` VARCHAR(255) NOT NULL DEFAULT '',
          \`performedBy\` VARCHAR(255) NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_budget_category_period\` (\`budgetCategoryId\`, \`year\`, \`month\`)
        ) ENGINE=InnoDB;
      `);
      console.log('Created MonthlyBudgetAuditLogs');
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

run();