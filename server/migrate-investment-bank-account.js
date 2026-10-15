// server/migrate-investment-bank-account.js
// Run once: node migrate-investment-bank-account.js
const sequelize = require('./config/db');

async function migrate() {
  console.log('--- Adding investments.bankAccountId ---');

  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'investments'
        AND COLUMN_NAME = 'bankAccountId'`
  );

  if (Number(rows[0].cnt) > 0) {
    console.log('✓ investments.bankAccountId already exists. Nothing to do.');
  } else {
    await sequelize.query('ALTER TABLE `investments` ADD COLUMN `bankAccountId` INT NULL');
    console.log('✓ investments.bankAccountId added.');
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});