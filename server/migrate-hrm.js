// server/migrate-hrm.js
const sequelize = require('./config/db');

async function runMigration() {
  console.log('🔄 Checking and updating HRM database tables...');

  try {
    const [cols] = await sequelize.query(`SHOW COLUMNS FROM employees;`);
    const existingCols = cols.map((c) => c.Field);

    const columnsToAdd = [
      { name: 'joiningDate', query: `ALTER TABLE employees ADD COLUMN joiningDate DATE NULL;` },
      { name: 'basicSalary', query: `ALTER TABLE employees ADD COLUMN basicSalary DOUBLE DEFAULT 0;` },
      { name: 'houseRent', query: `ALTER TABLE employees ADD COLUMN houseRent DOUBLE DEFAULT 0;` },
      { name: 'medicalAllowance', query: `ALTER TABLE employees ADD COLUMN medicalAllowance DOUBLE DEFAULT 0;` },
      { name: 'otherAllowance', query: `ALTER TABLE employees ADD COLUMN otherAllowance DOUBLE DEFAULT 0;` },
      { name: 'grossSalary', query: `ALTER TABLE employees ADD COLUMN grossSalary DOUBLE DEFAULT 0;` },
      { name: 'bankName', query: `ALTER TABLE employees ADD COLUMN bankName VARCHAR(255) NULL;` },
      { name: 'bankAccountNo', query: `ALTER TABLE employees ADD COLUMN bankAccountNo VARCHAR(255) NULL;` },
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name)) {
        await sequelize.query(col.query);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`ℹ️ Column already exists: ${col.name}`);
      }
    }

    // Create employee_advances table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employee_advances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId INT NOT NULL,
        type ENUM('Advance Salary', 'Loan') DEFAULT 'Advance Salary',
        amount DOUBLE NOT NULL DEFAULT 0,
        requestDate DATE NULL,
        repaymentMonths INT DEFAULT 1,
        monthlyDeduction DOUBLE DEFAULT 0,
        paidAmount DOUBLE DEFAULT 0,
        reason TEXT NULL,
        status ENUM('Pending', 'Approved', 'Disbursed', 'Rejected', 'Completed') DEFAULT 'Pending',
        disbursementDate DATE NULL,
        officeExpenseId INT NULL,
        approvedBy VARCHAR(255) NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (employeeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Checked/created table: employee_advances');

    console.log('🎉 HRM migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();