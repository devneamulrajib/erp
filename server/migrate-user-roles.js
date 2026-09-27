require('dotenv').config();
const sequelize = require('./config/db');

async function migrate() {
  await sequelize.query(`
    ALTER TABLE Users
    MODIFY COLUMN role ENUM('superadmin','admin','manager','accountant','storekeeper','sales','hr','user')
    NOT NULL DEFAULT 'user'
  `);
  try {
    await sequelize.query(`ALTER TABLE Users ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1`);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  console.log('User roles migrated.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});