require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function addColumnSafe(table, column, def) {
  const qi = sequelize.getQueryInterface();
  try {
    await qi.addColumn(table, column, def);
    console.log(`Added ${table}.${column}`);
  } catch (err) {
    if (/duplicate column|already exists/i.test(err.message)) {
      console.log(`Skipped ${table}.${column} (already exists)`);
    } else {
      console.error(`Failed adding ${table}.${column}:`, err.message);
    }
  }
}

(async () => {
  await sequelize.authenticate();

  // Supplier-side confirmation, delivery tracking, invoice upload
  await addColumnSafe('purchase_orders', 'supplierConfirmedAt', { type: DataTypes.DATE, allowNull: true });
  await addColumnSafe('purchase_orders', 'deliveryStatus', {
    type: DataTypes.ENUM('Pending', 'Shipped', 'Delivered'),
    defaultValue: 'Pending',
  });
  await addColumnSafe('purchase_orders', 'deliveryUpdatedAt', { type: DataTypes.DATE, allowNull: true });
  await addColumnSafe('purchase_orders', 'invoiceFile', { type: DataTypes.STRING, allowNull: true });
  await addColumnSafe('purchase_orders', 'invoiceUploadedAt', { type: DataTypes.DATE, allowNull: true });

  // Links a PO to the Bill created from its supplier invoice
  await addColumnSafe('purchase_orders', 'convertedToBillId', { type: DataTypes.INTEGER, allowNull: true });

  // New tables (MaterialRequisitionQuotation, MaterialRequisitionQuotationItem,
  // Notification) don't exist yet, so a plain sync() creates them fine.
  require('./models/associations');
  await sequelize.sync();

  console.log('Migration complete.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});