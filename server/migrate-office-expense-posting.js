// server/migrate-office-expense-posting.js
//
// One-time setup for automatic office-expense posting.
//
//   node migrate-office-expense-posting.js           -> dry run, changes nothing, prints what it would do
//   node migrate-office-expense-posting.js --apply   -> makes the changes
//
// What it does:
//   1. Lets the Vouchers.type column accept 'Office Expense'.
//   2. Approved expenses  -> (re)builds their journal entry and marks the voucher approved.
//   3. Pending / rejected -> removes any journal entry they already have, so only
//      approved expenses are on the ledger.
//   Expenses created by payroll (pay slips / employee advances) are skipped.
const sequelize = require('./config/db');
const { OfficeExpense, Voucher } = require('./models/associations');
const { syncLedger, isManagedElsewhere } = require('./utils/officeExpensePosting');

const APPLY = process.argv.includes('--apply');
const NEW_TYPE = 'Office Expense';

async function ensureVoucherType() {
  const table = Voucher.getTableName();
  const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'type'`);
  const current = cols[0]?.Type || '';

  if (current.includes(`'${NEW_TYPE}'`)) {
    console.log(`Vouchers.type already accepts "${NEW_TYPE}".`);
    return;
  }

  const values = Voucher.rawAttributes.type.values;
  const list = values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  const sql = `ALTER TABLE \`${table}\` MODIFY \`type\` ENUM(${list}) NOT NULL`;

  if (!APPLY) {
    console.log(`[dry run] would run: ${sql}`);
    return;
  }
  await sequelize.query(sql);
  console.log(`Vouchers.type now accepts "${NEW_TYPE}".`);
}

async function alignLedger() {
  const rows = await OfficeExpense.findAll({ order: [['id', 'ASC']] });
  let toPost = 0;
  let toUnpost = 0;
  let skipped = 0;
  let done = 0;
  let failed = 0;

  for (const row of rows) {
    if (await isManagedElsewhere(row)) {
      skipped += 1;
      continue;
    }

    const status = String(row.status || '').toLowerCase();
    const action = status === 'approved' ? 'post' : row.voucherId ? 'unpost' : null;
    if (!action) continue;

    if (action === 'post') toPost += 1;
    else toUnpost += 1;

    if (!APPLY) continue;

    const t = await sequelize.transaction();
    try {
      await syncLedger(row, { name: 'Migration' }, t);
      await row.save({ transaction: t });
      await t.commit();
      done += 1;
    } catch (err) {
      await t.rollback();
      failed += 1;
      console.error(`  ${row.reference || `#${row.id}`} (${action}) failed: ${err.message}`);
    }
  }

  console.log(`Office expenses checked: ${rows.length}`);
  console.log(`  approved, ledger entry to (re)build: ${toPost}`);
  console.log(`  pending/rejected, ledger entry to remove: ${toUnpost}`);
  console.log(`  skipped (created by payroll): ${skipped}`);
  if (APPLY) console.log(`  applied: ${done}, failed: ${failed}`);
}

async function migrate() {
  console.log(APPLY ? 'Applying changes...' : 'Dry run. Add --apply to make the changes.');
  await ensureVoucherType();
  await alignLedger();
  if (!APPLY) console.log('Nothing was changed.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});