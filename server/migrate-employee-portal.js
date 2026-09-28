const sequelize = require('./config/db');

async function runMigration() {
  console.log('🔄 Setting up Employee Portal tables...');

  try {
    const [cols] = await sequelize.query(`SHOW COLUMNS FROM employees;`);
    const existingCols = cols.map((c) => c.Field);

    const columnsToAdd = [
      { name: 'email', query: `ALTER TABLE employees ADD COLUMN email VARCHAR(255) NULL UNIQUE;` },
      { name: 'portalPassword', query: `ALTER TABLE employees ADD COLUMN portalPassword VARCHAR(255) NULL;` },
      { name: 'portalRole', query: `ALTER TABLE employees ADD COLUMN portalRole VARCHAR(50) DEFAULT 'employee';` },
      { name: 'createUser', query: `ALTER TABLE employees ADD COLUMN createUser BOOLEAN DEFAULT FALSE;` },
      { name: 'lastPortalLoginAt', query: `ALTER TABLE employees ADD COLUMN lastPortalLoginAt DATETIME NULL;` },
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name)) {
        await sequelize.query(col.query);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`ℹ️ Column already exists: ${col.name}`);
      }
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId INT NOT NULL,
        fromDate DATE NOT NULL,
        toDate DATE NOT NULL,
        days INT DEFAULT 1,
        reason TEXT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        adminNote VARCHAR(500) NULL,
        approvedBy VARCHAR(255) NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (employeeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Checked/created table: leave_requests');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('Present', 'Absent', 'Leave', 'Holiday') DEFAULT 'Present',
        markedBy VARCHAR(255) NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY employee_date (employeeId, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Checked/created table: attendances');

    console.log('🎉 Employee Portal migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();