// server/utils/paginate.js
// Optional, backward-compatible pagination for list endpoints.
// - No ?page  -> plain findAll(), same array response as before (a ?limit on its
//   own is ignored, exactly as today - some pages already send one).
// - ?page=N[&limit=M] -> { rows, total, page, limit, totalPages }.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePage(query = {}) {
  if (query.page === undefined || query.page === '') return null;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}

async function listOrPage(Model, options, query) {
  const p = parsePage(query);
  if (!p) return Model.findAll(options);
  // distinct: count parent rows, not joined child rows (hasMany includes).
  const { count, rows } = await Model.findAndCountAll({
    ...options,
    limit: p.limit,
    offset: p.offset,
    distinct: true,
  });
  return {
    rows,
    total: count,
    page: p.page,
    limit: p.limit,
    totalPages: Math.max(1, Math.ceil(count / p.limit)),
  };
}

module.exports = { parsePage, listOrPage };