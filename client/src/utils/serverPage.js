// Server pagination helpers for list pages (server: utils/paginate.js listOrPage).
// - With ?page&limit the API returns { rows, total, page, limit, totalPages }.
// - Without ?page it returns the plain array, as before (dropdowns, search mode).
// List pages ask for one page at a time while the search box is empty; while the
// user searches they load the full list and filter it in the browser, as before.

export function pageParams(enabled, page, limit) {
  return enabled ? { page, limit } : {};
}

// Normalise either response shape to { rows, total, paged }.
export function readPage(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length, paged: false };
  if (data && Array.isArray(data.rows)) {
    return { rows: data.rows, total: Number(data.total) || 0, paged: true };
  }
  return { rows: [], total: 0, paged: false };
}