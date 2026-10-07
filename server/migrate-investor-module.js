// server/migrate-investor-module.js
const sequelize = require('./config/db');

async function migrate() {
  console.log('--- Migrating Investor Management Module Tables ---');

  // 1. Investors Table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS Investors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investorCode VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      address TEXT,
      nidPassport VARCHAR(100),
      startDate DATE NOT NULL,
      investmentType ENUM('project_based', 'fixed_return', 'hybrid') DEFAULT 'project_based',
      profitSharePercent DECIMAL(5,2) DEFAULT 0.00,
      fixedReturnPercent DECIMAL(5,2) DEFAULT 0.00,
      status ENUM('active', 'inactive') DEFAULT 'active',
      notes TEXT,
      profileImage VARCHAR(255),
      chartOfAccountId INT NULL,
      userId INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Investments Table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS Investments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investmentCode VARCHAR(50) UNIQUE NOT NULL,
      investorId INT NOT NULL,
      projectId INT NULL,
      principalAmount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      investmentDate DATE NOT NULL,
      maturityDate DATE NULL,
      investmentType ENUM('project_based', 'fixed_return', 'equity') DEFAULT 'project_based',
      profitSharePercent DECIMAL(5,2) DEFAULT 0.00,
      expectedRoiPercent DECIMAL(5,2) DEFAULT 0.00,
      expectedProfit DECIMAL(15,2) DEFAULT 0.00,
      expectedReturn DECIMAL(15,2) DEFAULT 0.00,
      status ENUM('active', 'matured', 'partially_returned', 'fully_returned', 'cancelled') DEFAULT 'active',
      notes TEXT,
      voucherId INT NULL,
      debitAccountId INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId),
      INDEX (projectId),
      INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Investor Payments Table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorPayments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paymentCode VARCHAR(50) UNIQUE NOT NULL,
      investorId INT NOT NULL,
      investmentId INT NOT NULL,
      paymentDate DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      paymentType ENUM('profit_distribution', 'principal_return', 'combined') DEFAULT 'profit_distribution',
      principalPaid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      profitPaid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      paymentMethod ENUM('Cash', 'Bank', 'Cheque') DEFAULT 'Bank',
      bankAccountId INT NULL,
      creditAccountId INT NULL,
      referenceNo VARCHAR(100),
      status ENUM('completed', 'pending') DEFAULT 'completed',
      notes TEXT,
      attachment VARCHAR(255),
      voucherId INT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId),
      INDEX (investmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✓ Investor tables created successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});