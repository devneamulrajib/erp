require('dotenv').config();
const sequelize = require('./config/db');

async function addColumn(sql) {
  try {
    await sequelize.query(sql);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

async function migrate() {
  await addColumn(`ALTER TABLE monthlybudgets ADD COLUMN rejectedBy VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE monthlybudgets ADD COLUMN rejectedAt DATETIME NULL`);
  await addColumn(`ALTER TABLE monthlybudgets ADD COLUMN rejectionReason VARCHAR(500) NULL`);

  // Widen the audit log's action ENUM to accept Approved/Rejected.
  await sequelize.query(`
    ALTER TABLE monthlybudgetauditlogs
    MODIFY COLUMN action ENUM('Created','Updated','Deleted','Approved','Rejected') NOT NULL
  `);

  console.log('monthlybudgets rejection fields + audit log ENUM migrated.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});