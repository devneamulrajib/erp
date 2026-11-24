// server/scripts/perf-indexes.js
// Adds missing secondary indexes on columns the ERP filters/sorts lists by
// (dates, createdAt, status, type, account columns). Safe and re-runnable:
// every index is skipped if the table/column is missing, the column type
// can't be indexed, or an index already starts with the same column(s).
//
// DRY RUN by default (read-only, just prints the plan):
//   node scripts/perf-indexes.js
// Actually create the indexes (take a mysqldump backup first):
//   node scripts/perf-indexes.js --apply
//
// Lives in scripts/ (not migrate-*.js) on purpose: deploy.sh auto-runs every
// new migrate-*.js on the server, and this must only run when Rajib decides.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const APPLY = process.argv.includes('--apply');

// [table, [columns...]] - table names as they exist in MySQL (lowercase).
const WANTED = [
  ['vouchers', ['date']],
  ['vouchers', ['type', 'date']],
  ['vouchers', ['status']],
  ['vouchers', ['createdAt']],
  ['voucherentries', ['accountId']],
  ['journalvouchers', ['date']],
  ['journalvouchers', ['createdAt']],
  ['journalvouchers', ['project']],
  ['journalvoucherlines', ['account']],
  ['contravouchers', ['date']],
  ['purchases', ['date']],
  ['purchases', ['createdAt']],
  ['purchase_orders', ['date']],
  ['purchase_orders', ['createdAt']],
  ['bills', ['date']],
  ['bills', ['createdAt']],
  ['sales', ['date']],
  ['sales', ['createdAt']],
  ['officeexpenses', ['date']],
  ['expenses', ['date']],
  ['expenses', ['project']],
  ['items', ['createdAt']],
  ['items', ['name']],
  ['materialrequisitions', ['date']],
  ['materialrequisitions', ['createdAt']],
  ['notifications', ['createdAt']],
  ['notifications', ['read']],
  ['activitylogs', ['module']],
  ['attendances', ['date']],
  ['tasks', ['status']],
  ['tasks', ['dueDate']],
  ['tasks', ['createdAt']],
  ['tasktimelogs', ['endedAt']],
];

const NOT_INDEXABLE = new Set(['text', 'tinytext', 'mediumtext', 'longtext', 'blob', 'mediumblob', 'longblob', 'json', 'geometry']);

async function select(sql, replacements) {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

async function columnsOf(table) {
  const rows = await select(
    'SELECT COLUMN_NAME AS c, DATA_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t',
    { t: table }
  );
  return new Map(rows.map((r) => [r.c, String(r.t).toLowerCase()]));
}

// Every index on the table as an ordered column list.
async function indexesOf(table) {
  const rows = await select(
    `SELECT INDEX_NAME AS i, COLUMN_NAME AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    { t: table }
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.i)) map.set(r.i, []);
    map.get(r.i).push(r.c);
  }
  return map;
}

function covered(indexes, cols) {
  for (const idxCols of indexes.values()) {
    if (cols.every((c, i) => idxCols[i] === c)) return true;
  }
  return false;
}

async function run() {
  await sequelize.authenticate();
  console.log(APPLY ? 'APPLY mode: missing indexes will be created.\n' : 'DRY RUN (read-only). Re-run with --apply to create them.\n');

  let planned = 0;
  let created = 0;
  for (const [table, cols] of WANTED) {
    const columns = await columnsOf(table);
    const label = `${table}(${cols.join(', ')})`;
    if (!columns.size) { console.log(`  skip ${label}: table not found`); continue; }
    const missing = cols.filter((c) => !columns.has(c));
    if (missing.length) { console.log(`  skip ${label}: column ${missing.join(', ')} not found`); continue; }
    const bad = cols.filter((c) => NOT_INDEXABLE.has(columns.get(c)));
    if (bad.length) { console.log(`  skip ${label}: ${bad.join(', ')} is ${columns.get(bad[0])}`); continue; }
    if (covered(await indexesOf(table), cols)) { console.log(`  ok   ${label}: already indexed`); continue; }

    const name = `idx_perf_${table}_${cols.join('_')}`.slice(0, 64);
    planned += 1;
    if (!APPLY) { console.log(`  plan ${label} -> ${name}`); continue; }
    try {
      await sequelize.query(`CREATE INDEX \`${name}\` ON \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')})`);
      created += 1;
      console.log(`  +    ${label} -> ${name}`);
    } catch (err) {
      console.log(`  FAIL ${label}: ${err.message}`);
    }
  }

  console.log(APPLY ? `\nDone. Created ${created} of ${planned} index(es).` : `\n${planned} index(es) would be created.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('perf-indexes failed:', err.message);
  process.exit(1);
});