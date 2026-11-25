// server/migrate-user-modules.js
// Adds Users.modules (TEXT NULL): JSON list of ERP sections a user may open,
// e.g. ["accounts","hrm"]. NULL = keep the role-based access (existing users).
// Safe to run more than once.
require('dotenv').config();
const sequelize = require('./config/db');

async function migrate() {
  let added = false;
  for (const table of ['Users', 'users']) {
    try {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN modules TEXT NULL`);
      console.log(`✅ Added "modules" column to ${table} table.`);
      added = true;
      break;
    } catch (err) {
      if (/duplicate column/i.test(err.message)) {
        console.log(`ℹ️ "modules" column already exists on ${table}.`);
        added = true;
        break;
      }
      // Wrong table-name casing on this server - try the next one.
      if (!/doesn't exist|no such table/i.test(err.message)) {
        console.error('Migration error:', err.message);
      }
    }
  }
  if (!added) console.error('Could not find the Users table.');
  process.exit(0);
}

migrate();
