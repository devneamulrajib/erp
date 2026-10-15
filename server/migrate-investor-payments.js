// server/migrate-investor-payments.js
// Run once: node migrate-investor-payments.js
const sequelize = require('./config/db');
const InvestorPayment = require('./models/InvestorPayment');

async function migrate() {
  console.log('--- Migrating investor payouts / receipts / bank accounts ---');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorBankAccounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investorId INT NOT NULL,
      bankName VARCHAR(150) NOT NULL,
      accountName VARCHAR(150) NOT NULL,
      accountNumber VARCHAR(80) NOT NULL,
      branch VARCHAR(150) NULL,
      routingNumber VARCHAR(50) NULL,
      isDefault TINYINT(1) NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestmentReceipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receiptCode VARCHAR(30) NOT NULL UNIQUE,
      investmentId INT NOT NULL,
      investorId INT NOT NULL,
      receiptDate DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      paymentMethod ENUM('Cash','Bank','Cheque','Multiple') NOT NULL DEFAULT 'Bank',
      notes TEXT NULL,
      createdBy VARCHAR(255) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investmentId),
      INDEX (investorId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorPaymentLines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parentType ENUM('receipt','payout') NOT NULL,
      parentId INT NOT NULL,
      method ENUM('Cash','Bank','Cheque') NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      bankAccountId INT NULL,
      investorBankAccountId INT NULL,
      bankName VARCHAR(150) NULL,
      accountName VARCHAR(150) NULL,
      accountNumber VARCHAR(80) NULL,
      branch VARCHAR(150) NULL,
      referenceNo VARCHAR(120) NULL,
      chequeNo VARCHAR(60) NULL,
      chequeDate DATE NULL,
      attachment VARCHAR(255) NULL,
      attachmentName VARCHAR(255) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (parentType, parentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Payouts can now be split across methods, so allow 'Multiple'
  const t = InvestorPayment.getTableName();
  const table = typeof t === 'string' ? t : t.tableName;
  try {
    await sequelize.query(
      `ALTER TABLE \`${table}\` MODIFY COLUMN paymentMethod ENUM('Cash','Bank','Cheque','Multiple') NOT NULL DEFAULT 'Bank'`
    );
    console.log(`✓ ${table}.paymentMethod now allows 'Multiple'.`);
  } catch (err) {
    console.warn(`! Could not alter ${table}.paymentMethod: ${err.message}`);
  }

  console.log('✓ Investor payment tables created successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});