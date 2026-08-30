import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Wrench } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import api from '../api/axios';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function MaterialUsageReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/material-usage', { params });
      setRows(res.data || []);
    } catch (err) {
      console.error('Failed to load material usage report', err);
      setError('Failed to load material usage report.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.code?.toLowerCase().includes(q) ||
      r.employee?.toLowerCase().includes(q) ||
      r.Project?.name?.toLowerCase().includes(q) ||
      r.Site?.name?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalAmount = filtered.reduce((sum, r) => sum + (Number(r.grandTotal) || 0), 0);
  const totalItemsUsed = filtered.reduce(
    (sum, r) => sum + (r.MaterialUsageItems || []).reduce((s, it) => s + (Number(it.useQty) || 0), 0),
    0
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Inventory', to: '/dashboard/inventory' },
                { label: 'Material Usage Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Material Usage Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Materials consumed across projects and sites</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Entries</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Amount</div>
            <div className="text-xl font-semibold text-slate-900">{totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Qty Used</div>
            <div className="text-xl font-semibold text-slate-900">{totalItemsUsed.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code / employee / project..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Employee</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Site</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Items</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400 text-sm">Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No material usage records found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          <Wrench size={12} />
                          {row.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{row.date}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.employee || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.Project?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.Site?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-right text-slate-600">{(row.MaterialUsageItems || []).length}</td>
                      <td className="px-5 py-3.5 text-right text-slate-700 font-medium">{Number(row.grandTotal || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}