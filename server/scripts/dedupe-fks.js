// server/scripts/dedupe-fks.js
// Finds duplicate foreign keys and duplicate indexes (left behind by old
// sync({ alter: true }) runs - e.g. 63 identical unique indexes on
// customers.code) and, only when asked, drops the extra copies, keeping one.
//
//   node scripts/dedupe-fks.js                 DRY RUN: read-only report
//   node scripts/dedupe-fks.js --apply         drop duplicate FKs + indexes
//   node scripts/dedupe-fks.js --apply --restrict-item-masters
//        also switch items / billitems / serviceitems -> categories, brands,
//        units from ON DELETE CASCADE to ON DELETE RESTRICT
//   --table=customers  limit to one table (works with any mode)
//
// Rules (conservative):
// - A FK group = same table, same column(s), same referenced table/column(s).
//   Extras are dropped only when every copy has the SAME ON DELETE / ON UPDATE
//   rules; groups with mixed rules are reported and left alone.
// - An index group = same table, same ordered columns, same uniqueness and
//   type. PRIMARY is never touched. The shortest/lowest-numbered name is kept.
// - Each table is changed with single ALTER TABLE statements, so a failure
//   leaves that table as it was.
// Take a mysqldump backup before --apply. Lives in scripts/ (not migrate-*.js)
// so deploy.sh never runs it automatically.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const APPLY = process.argv.includes('--apply');
const RESTRICT = process.argv.includes('--restrict-item-masters');
const TABLE_ARG = (process.argv.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null;

const ITEM_TABLES = new Set(['items', 'billitems', 'serviceitems']);
const MASTER_TABLES = new Set(['categories', 'brands', 'units']);

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const tick = (s) => `\`${String(s).replace(/`/g, '``')}\``;

// Natural sort: items_ibfk_2 before items_ibfk_10; shorter names first.
function nameOrder(a, b) {
  const na = Number((a.match(/(\d+)$/) || [])[1] || 0);
  const nb = Number((b.match(/(\d+)$/) || [])[1] || 0);
  const sa = a.replace(/_?\d+$/, '');
  const sb = b.replace(/_?\d+$/, '');
  if (sa !== sb) return sa.length - sb.length || sa.localeCompare(sb);
  return na - nb;
}

async function loadForeignKeys() {
  const rows = await q(
    `SELECT k.TABLE_NAME AS t, k.CONSTRAINT_NAME AS name, k.COLUMN_NAME AS col,
            k.REFERENCED_TABLE_NAME AS rt, k.REFERENCED_COLUMN_NAME AS rcol,
            r.DELETE_RULE AS onDelete, r.UPDATE_RULE AS onUpdate
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
       JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
        ${TABLE_ARG ? 'AND k.TABLE_NAME = :table' : ''}
      ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`,
    { table: TABLE_ARG }
  );
  const fks = new Map();
  for (const r of rows) {
    const id = `${r.t}.${r.name}`;
    if (!fks.has(id)) fks.set(id, { table: r.t, name: r.name, cols: [], rt: r.rt, rcols: [], onDelete: r.onDelete, onUpdate: r.onUpdate });
    const fk = fks.get(id);
    fk.cols.push(r.col);
    fk.rcols.push(r.rcol);
  }
  const groups = new Map();
  for (const fk of fks.values()) {
    const key = `${fk.table}(${fk.cols.join(',')}) -> ${fk.rt}(${fk.rcols.join(',')})`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fk);
  }
  for (const list of groups.values()) list.sort((a, b) => nameOrder(a.name, b.name));
  return groups;
}

async function loadIndexes() {
  const rows = await q(
    `SELECT TABLE_NAME AS t, INDEX_NAME AS name, COLUMN_NAME AS col, SUB_PART AS sub,
            NON_UNIQUE AS nonUnique, INDEX_TYPE AS type
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME <> 'PRIMARY'
        ${TABLE_ARG ? 'AND TABLE_NAME = :table' : ''}
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    { table: TABLE_ARG }
  );
  const idx = new Map();
  for (const r of rows) {
    const id = `${r.t}.${r.name}`;
    if (!idx.has(id)) idx.set(id, { table: r.t, name: r.name, cols: [], unique: Number(r.nonUnique) === 0, type: r.type });
    idx.get(id).cols.push(r.sub ? `${r.col}(${r.sub})` : r.col);
  }
  const groups = new Map();
  for (const i of idx.values()) {
    const key = `${i.table}(${i.cols.join(',')}) ${i.unique ? 'UNIQUE' : 'INDEX'} ${i.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  for (const list of groups.values()) list.sort((a, b) => nameOrder(a.name, b.name));
  return groups;
}

async function alter(table, clauses, label) {
  if (!clauses.length) return true;
  const sql = `ALTER TABLE ${tick(table)} ${clauses.join(', ')}`;
  if (!APPLY) return true;
  try {
    await sequelize.query(sql);
    console.log(`  done  ${label}`);
    return true;
  } catch (err) {
    console.log(`  FAIL  ${label}: ${err.message}`);
    return false;
  }
}

async function run() {
  await sequelize.authenticate();
  console.log(APPLY ? 'APPLY mode - changes WILL be made.' : 'DRY RUN - read-only report. Add --apply to make changes.');
  if (TABLE_ARG) console.log(`Only table: ${TABLE_ARG}`);

  // ---------- 1. Duplicate foreign keys ----------
  const fkGroups = await loadForeignKeys();
  const fkDrops = new Map(); // table -> [constraint names]
  let fkExtra = 0;
  let mixed = 0;
  console.log('\n== Duplicate foreign keys ==');
  for (const [key, list] of fkGroups) {
    if (list.length < 2) continue;
    const rules = new Set(list.map((f) => `${f.onDelete}/${f.onUpdate}`));
    if (rules.size > 1) {
      mixed += 1;
      console.log(`  MIXED ${key}: ${list.length} copies with different rules (${[...rules].join(', ')}) - left alone`);
      continue;
    }
    const [keep, ...extra] = list;
    fkExtra += extra.length;
    console.log(`  ${key}: ${list.length} copies (ON DELETE ${keep.onDelete}) - keep ${keep.name}, drop ${extra.length}`);
    if (!fkDrops.has(keep.table)) fkDrops.set(keep.table, []);
    fkDrops.get(keep.table).push(...extra.map((f) => f.name));
  }
  console.log(`  -> ${fkExtra} duplicate FK(s) to drop, ${mixed} mixed-rule group(s) left alone.`);

  if (APPLY) {
    for (const [table, names] of fkDrops) {
      // Batches keep each ALTER statement a reasonable size.
      for (let i = 0; i < names.length; i += 50) {
        const batch = names.slice(i, i + 50);
        await alter(table, batch.map((n) => `DROP FOREIGN KEY ${tick(n)}`), `${table}: drop ${batch.length} duplicate FK(s)`);
      }
    }
  }

  // ---------- 2. Duplicate indexes ----------
  const idxGroups = await loadIndexes();
  const idxDrops = new Map();
  let idxExtra = 0;
  console.log('\n== Duplicate indexes ==');
  for (const [key, list] of idxGroups) {
    if (list.length < 2) continue;
    const [keep, ...extra] = list;
    idxExtra += extra.length;
    console.log(`  ${key}: ${list.length} copies - keep ${keep.name}, drop ${extra.length}`);
    if (!idxDrops.has(keep.table)) idxDrops.set(keep.table, []);
    idxDrops.get(keep.table).push(...extra.map((i) => i.name));
  }
  console.log(`  -> ${idxExtra} duplicate index(es) to drop.`);

  if (APPLY) {
    for (const [table, names] of idxDrops) {
      for (let i = 0; i < names.length; i += 50) {
        const batch = names.slice(i, i + 50);
        await alter(table, batch.map((n) => `DROP INDEX ${tick(n)}`), `${table}: drop ${batch.length} duplicate index(es)`);
      }
    }
  }

  // ---------- 3. Optional: item masters CASCADE -> RESTRICT ----------
  if (RESTRICT) {
    console.log('\n== items / billitems / serviceitems -> categories, brands, units: ON DELETE RESTRICT ==');
    const current = APPLY ? await loadForeignKeys() : fkGroups;
    for (const list of current.values()) {
      const f = list[0];
      if (!ITEM_TABLES.has(f.table) || !MASTER_TABLES.has(f.rt)) continue;
      if (list.every((x) => x.onDelete === 'RESTRICT' || x.onDelete === 'NO ACTION') && list.length === 1) {
        console.log(`  ok    ${f.table}(${f.cols.join(',')}) -> ${f.rt}: already ${f.onDelete}`);
        continue;
      }
      const newName = `fk_${f.table}_${f.cols.join('_')}_restrict`.slice(0, 64);
      const clauses = [
        ...list.map((x) => `DROP FOREIGN KEY ${tick(x.name)}`),
        `ADD CONSTRAINT ${tick(newName)} FOREIGN KEY (${f.cols.map(tick).join(', ')}) REFERENCES ${tick(f.rt)} (${f.rcols.map(tick).join(', ')}) ON DELETE RESTRICT ON UPDATE CASCADE`,
      ];
      console.log(`  ${APPLY ? '' : 'plan  '}${f.table}(${f.cols.join(',')}) -> ${f.rt}: replace ${list.length} FK(s) (${f.onDelete}) with ${newName} (RESTRICT)`);
      // One statement: if existing rows break the new FK, MySQL rejects it and nothing changes.
      await alter(f.table, clauses, `${f.table}.${f.cols.join(',')} -> ${f.rt} RESTRICT`);
    }
  }

  console.log(APPLY ? '\nFinished.' : '\nDry run finished - nothing was changed.');
  process.exit(0);
}

run().catch((err) => {
  console.error('dedupe-fks failed:', err.message);
  process.exit(1);
});