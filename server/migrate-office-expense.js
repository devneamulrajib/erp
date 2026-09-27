const sequelize = require('./config/db');

async function migrate() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS OfficeExpenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      budgetCategoryId INT NOT NULL,
      title VARCHAR(255) DEFAULT '',
      drAccount VARCHAR(255),
      crAccount VARCHAR(255),
      amount FLOAT DEFAULT 0,
      reference VARCHAR(255),
      status VARCHAR(255) DEFAULT 'pending',
      attachment VARCHAR(255) DEFAULT '',
      voucherId INT,
      addedBy VARCHAR(255),
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    )
  `);
  console.log('OfficeExpenses table created (or already existed).');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});