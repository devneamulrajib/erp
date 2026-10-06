// server/migrate-user-multi-roles.js
require('dotenv').config();
const sequelize = require('./config/db');

async function migrate() {
  try {
    await sequelize.query(`
      ALTER TABLE Users
      ADD COLUMN roles TEXT NULL
    `);
    console.log('✅ Added "roles" column to Users table.');
  } catch (err) {
    if (/duplicate column/i.test(err.message)) {
      console.log('ℹ️ "roles" column already exists.');
    } else {
      console.error('Migration error:', err.message);
    }
  }
  process.exit(0);
}

migrate();