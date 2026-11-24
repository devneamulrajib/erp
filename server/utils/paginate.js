// server/utils/paginate.js
// Optional, backward-compatible pagination for list endpoints.
// - No ?page  -> plain findAll(), same array response as before (a ?limit on its
//   own is ignored, exactly as today - some pages already send one).
// - ?page=N[&limit=M] -> { rows, total, page, limit, totalPages[, totals] }.
//   `totals` (optional extra.totals()) = aggregates over the WHOLE filtered set,
//   so list pages can show their summary cards while loading one page of rows.
const { fn, col } = require('sequelize');
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePage(query = {}) {
  if (query.page === undefined || query.page === '') return null;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}

async function listOrPage(Model, options, query, extra = {}) {
  const p = parsePage(query);
  if (!p) return Model.findAll(options);
  // distinct: count parent rows, not joined child rows (hasMany includes).
  const [{ count, rows }, totals] = await Promise.all([
    Model.findAndCountAll({
      ...options,
      limit: p.limit,
      offset: p.offset,
      distinct: true,
    }),
    extra.totals ? extra.totals() : null,
  ]);
  const out = {
    rows,
    total: count,
    page: p.page,
    limit: p.limit,
    totalPages: Math.max(1, Math.ceil(count / p.limit)),
  };
  if (totals) out.totals = totals;
  return out;
}

// SUM() of plain numeric columns over `where` (one query): { col: number }.
async function sumColumns(Model, where, columns) {
  const row = await Model.findOne({
    where,
    attributes: columns.map((c) => [fn('COALESCE', fn('SUM', col(c)), 0), c]),
    raw: true,
  });
  return Object.fromEntries(columns.map((c) => [c, Number(row && row[c]) || 0]));
}

module.exports = { parsePage, listOrPage, sumColumns };