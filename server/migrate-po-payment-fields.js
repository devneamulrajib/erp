require('dotenv').config();
const sequelize = require('./config/db');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`Skip ${table}.${column} (already exists)`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`Added ${table}.${column}`);
}

async function run() {
  try {
    await addColumnIfMissing('purchase_orders', 'deliveryConfirmedAt', '`deliveryConfirmedAt` DATETIME NULL');
    await addColumnIfMissing('purchase_orders', 'paymentStatus', "`paymentStatus` VARCHAR(255) NOT NULL DEFAULT 'Unpaid'");
    await addColumnIfMissing('purchase_orders', 'paidAt', '`paidAt` DATETIME NULL');
    await addColumnIfMissing('purchase_orders', 'supplierPaymentConfirmedAt', '`supplierPaymentConfirmedAt` DATETIME NULL');

    await addColumnIfMissing('Notifications', 'audience', "`audience` VARCHAR(255) NOT NULL DEFAULT 'admin'");
    await addColumnIfMissing('Notifications', 'audienceId', '`audienceId` INT NULL');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

run();