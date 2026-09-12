require('dotenv').config();
const sequelize = require('./config/db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`- ${table}.${column} already exists, skipping`);
    return;
  }
  await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`+ added ${table}.${column}`);
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');

    await addColumnIfMissing('Bills', 'status', "VARCHAR(50) NULL DEFAULT 'Unpaid'");

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();