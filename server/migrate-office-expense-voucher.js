// server/migrate-office-expense-voucher.js
// Adds the optional "voucher" fields used by the redesigned Office Expense form.
// Safe to run more than once: only adds columns that are missing.
//
// Run:  node migrate-office-expense-voucher.js
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');

const NEW_COLUMNS = {
  paidTo: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  billNo: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  paymentMethod: { type: DataTypes.STRING, allowNull: true, defaultValue: '' }, // Cash | Bank | Cheque
  paymentRef: { type: DataTypes.STRING, allowNull: true, defaultValue: '' }, // cheque no. / bank txn ref
};

async function migrate() {
  const qi = sequelize.getQueryInterface();
  const existing = await qi.describeTable('OfficeExpenses');

  for (const [name, definition] of Object.entries(NEW_COLUMNS)) {
    if (existing[name]) {
      console.log(`OfficeExpenses.${name} already exists, skipping.`);
    } else {
      // eslint-disable-next-line no-await-in-loop
      await qi.addColumn('OfficeExpenses', name, definition);
      console.log(`Added OfficeExpenses.${name}.`);
    }
  }

  console.log('Office expense voucher migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});