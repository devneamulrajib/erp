// server/migrate-investor-extras.js
const sequelize = require('./config/db');

async function migrate() {
  console.log('--- Migrating Investor Documents / Messages / Notes ---');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorDocuments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investorId INT NOT NULL,
      investmentId INT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'other',
      fileName VARCHAR(255) NOT NULL,
      originalName VARCHAR(255) NOT NULL,
      mimeType VARCHAR(100),
      fileSize INT DEFAULT 0,
      visibleToInvestor TINYINT(1) NOT NULL DEFAULT 1,
      uploadedBy VARCHAR(255),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId),
      INDEX (investmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorMessages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investorId INT NOT NULL,
      direction ENUM('outbound', 'inbound') NOT NULL DEFAULT 'outbound',
      channel VARCHAR(30) NOT NULL DEFAULT 'portal',
      subject VARCHAR(255) NULL,
      body TEXT NOT NULL,
      sentBy VARCHAR(255),
      readAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS InvestorNotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      investorId INT NOT NULL,
      body TEXT NOT NULL,
      visibility ENUM('internal', 'shared') NOT NULL DEFAULT 'internal',
      createdBy VARCHAR(255),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (investorId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✓ Investor extras tables created successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});