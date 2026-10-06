// server/activate-users.js
require('dotenv').config();
const db = require('./config/db');

async function activateAll() {
  try {
    await db.query('UPDATE Users SET isActive = 1');
    console.log('✅ Success: All users are now set to Active!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating users:', err.message);
    process.exit(1);
  }
}

activateAll();