// server/migrate-investor-ledger.js
// Run once: node migrate-investor-ledger.js
const sequelize = require('./config/db');

async function migrate() {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'InvestorPaymentLines'
        AND COLUMN_NAME = 'voucherId'`
  );

  if (Number(rows[0].cnt) > 0) {
    console.log('✓ InvestorPaymentLines.voucherId already exists. Nothing to do.');
  } else {
    await sequelize.query('ALTER TABLE `InvestorPaymentLines` ADD COLUMN `voucherId` INT NULL');
    console.log('✓ InvestorPaymentLines.voucherId added.');
  }
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});