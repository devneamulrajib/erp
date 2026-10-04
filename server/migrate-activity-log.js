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
    if (await tableExists('ActivityLogs')) {
      console.log('Skip ActivityLogs (already exists)');
    } else {
      await sequelize.query(`
        CREATE TABLE \`ActivityLogs\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`module\` VARCHAR(255) NOT NULL,
          \`action\` VARCHAR(255) NOT NULL,
          \`message\` VARCHAR(255) NOT NULL,
          \`amount\` FLOAT NULL,
          \`budgetCategoryId\` INT NULL,
          \`relatedType\` VARCHAR(255) NULL,
          \`relatedId\` INT NULL,
          \`performedBy\` VARCHAR(255) NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_activity_created\` (\`createdAt\`),
          INDEX \`idx_activity_category\` (\`budgetCategoryId\`)
        ) ENGINE=InnoDB;
      `);
      console.log('Created ActivityLogs');
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

run();