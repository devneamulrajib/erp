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
    if (await tableExists('standing_deductions')) {
      console.log('Skip standing_deductions (already exists)');
    } else {
      await sequelize.query(`
        CREATE TABLE \`standing_deductions\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`title\` VARCHAR(255) NOT NULL,
          \`amount\` FLOAT NOT NULL,
          \`type\` ENUM('Deduction','Addition') NOT NULL DEFAULT 'Deduction',
          \`appliesTo\` ENUM('All','Employee') NOT NULL DEFAULT 'All',
          \`employeeId\` INT NULL,
          \`active\` TINYINT(1) NOT NULL DEFAULT 1,
          \`startMonth\` INT NULL,
          \`startYear\` INT NULL,
          \`endMonth\` INT NULL,
          \`endYear\` INT NULL,
          \`addedBy\` VARCHAR(255) NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
      console.log('Created standing_deductions');
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

run();