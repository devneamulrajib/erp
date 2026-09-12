import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, FileSpreadsheet, Search, Receipt, Wallet } from 'lucide-react';
import { getExpenseReport } from '../api/accountingReports';
import { getProjects } from '../api/project';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function ExpenseReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [project, setProject] = useState('');
  const [projects, setProjects] = useState([]);

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getExpenseReport({ from, to, project: project || undefined });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load expense report', err);
      setError(err.message || 'Failed to load expense report');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [from, to, project]);

  useEffect(() => { load(); }, [load]);

  // The Expense form stores a project's name (not its id) on each
  // record, so this dropdown filters by name too — matching how
  // ExpensePage.jsx / ExpenseListPage.jsx already populate the field.
  useEffect(() => {
    getProjects()
      .then((data) => setProjects(Array.isArray(data) ? data : data?.data || data?.projects || []))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.description || '').toLowerCase().includes(q)
      || (r.voucherNo || '').toLowerCase().includes(q)
      || (r.note || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['SL', 'Date', 'Voucher', 'Description', 'Note', 'Amount'];
    const lines = filtered.map((r, i) => [
      i + 1,
      new Date(r.date).toLocaleDateString('en-GB'),
      r.voucherNo,
      r.description,
      r.note,
      (r.amount || 0).toFixed(2),
    ]);
    lines.push(['', '', '', '', 'Total', total.toFixed(2)]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module (Report)', to: '/accounts-module/reports' },
                { label: 'Expense Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Expense Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track recorded expenses over a date range</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Previous
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <Receipt size={12} /> Entries
            </div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <Wallet size={12} /> Total Expense
            </div>
            <div className="text-xl font-semibold text-indigo-600">{formatMoney(total)}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From Date</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To Date</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expenses..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-red-600/20 transition-colors"
              >
                <FileText size={14} />
                PDF
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Date', 'Voucher', 'Description', 'Note', 'Amount'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-medium text-xs uppercase tracking-wide ${i === 5 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Receipt size={28} strokeWidth={1.5} />
                        <p className="text-sm">No expenses found for this date range and filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-indigo-600 font-medium">{r.voucherNo || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-700">{r.description || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-500">{r.note || '-'}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{formatMoney(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-indigo-50/70 font-semibold border-t border-indigo-100">
                    <td colSpan={5} className="px-4 py-3.5 text-slate-700 text-center">Total</td>
                    <td className="px-4 py-3.5 text-right text-indigo-700">{formatMoney(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{(page - 1) * pageSize + pageRows.length}</span> of{' '}
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