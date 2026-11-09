// server/migrate-missing-columns.js
// Adds any model column that is missing from the live MySQL table.
// Safe to re-run: existing columns are never touched.
//   node migrate-missing-columns.js --dry   (preview only)
//   node migrate-missing-columns.js         (apply)
require('dotenv').config();
const sequelize = require('./config/db');
const models = require('./models/associations');

const DRY = process.argv.includes('--dry');

const TARGETS = [
  'Expense',
  'ExpenseApproval',
  'PaymentVoucher',
  'PaymentVoucherApproval',
  'ReceiptVoucher',
  'ReceiptVoucherApproval',
  'JournalVoucher',
  'JournalVoucherLine',
  'JournalVoucherApproval',
  'ContraVoucher',
  'ContraVoucherLine',
  'ContraVoucherApproval',
  'Voucher',
  'VoucherEntry',
  'OfficeExpense',
  'MonthlyBudget',
  'BudgetCategory',
];

// MySQL does not allow literal defaults on these column types.
const NO_DEFAULT_TYPES = ['TEXT', 'BLOB', 'JSON', 'GEOMETRY'];

async function run() {
  const qi = sequelize.getQueryInterface();
  let added = 0;

  for (const name of TARGETS) {
    const model = models[name];
    if (!model) {
      console.log(`- ${name}: model not exported, skipped`);
      continue;
    }

    const rawTable = model.getTableName();
    const table = typeof rawTable === 'string' ? rawTable : rawTable.tableName;

    let existing;
    try {
      existing = await qi.describeTable(table);
    } catch {
      console.log(`- ${name}: table "${table}" does not exist yet (sync() creates it on server start), skipped`);
      continue;
    }

    for (const [col, attr] of Object.entries(model.rawAttributes)) {
      const field = attr.field || col;
      if (existing[field] || attr.primaryKey || attr.autoIncrement) continue;

      // Added as nullable, no FK constraint, so existing rows never block the migration.
      const def = { type: attr.type, allowNull: true };
      const typeKey = attr.type && attr.type.key;
      if (
        ['string', 'number', 'boolean'].includes(typeof attr.defaultValue) &&
        !NO_DEFAULT_TYPES.includes(typeKey)
      ) {
        def.defaultValue = attr.defaultValue;
      }

      console.log(`${DRY ? '[dry] ' : ''}+ ${table}.${field}`);
      if (!DRY) await qi.addColumn(table, field, def);
      added += 1;
    }
  }

  console.log(
    added === 0
      ? '\nNothing to add: database already matches the models.'
      : `\n${DRY ? 'Would add' : 'Added'} ${added} column(s).`,
  );
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());