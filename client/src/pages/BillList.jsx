import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, deleteBill } from '../api/bill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle, FileSpreadsheet, FileText, LayoutGrid } from 'lucide-react';

function num(v) { return Number(v) || 0; }

export default function BillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBills({ from, to });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this bill?')) return;
    try {
      await deleteBill(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  function exportCsv() {
    const header = ['ID', 'Project Type', 'Project', 'Customer Name', 'Code', 'Ref', 'Date', 'Grand Total', 'Added By'];
    const lines = filtered.map((r, i) => [
      i + 1, r.projectType || '', r.project?.name || '', r.customer?.name || '',
      r.code || '', r.refWoNo || '', r.date || '', num(r.grandTotal), r.addedBy || '',
    ]);
    const csv = [header, ...lines].map((l) => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bill_list.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.refWoNo, r.customer?.name, r.project?.name]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/bill_list' },
                { label: 'Invoice/Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Invoice / Bill List</h1>
            <p className="text-sm text-slate-500 mt-0.5">View and manage all bills and invoices</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/billing/bill')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <PlusCircle size={16} strokeWidth={2.5} /> New Bill/Invoice
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Back to Previous
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>
        )}

        {/* Date filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Bills</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Grand Total</div>
            <div className="text-xl font-semibold text-slate-900">
              {filtered.reduce((s, r) => s + num(r.grandTotal), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{paged.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileText size={13} /> PDF
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500 ml-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bills..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project Type', 'Project', 'Customer Name', 'Code', 'Ref', 'Date',
                    'Grand Total', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No bills found. Try adjusting your filters or create a new bill.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5">
                        {row.projectType ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-medium">
                            {row.projectType}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{row.project?.name || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{row.customer?.name || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{row.refWoNo || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.date || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.addedBy || '—'}</td>
                      <td className="px-5 py-3.5">
                        {(row.approvals || []).length === 0 ? '—' : (row.approvals || []).map((a, idx) => (
                          <div key={idx} className={`text-xs font-medium ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.approved ? '✓' : '✗'} {a.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.attachment
                          ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-medium">File</a>
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 relative">
                        <button
                          onClick={() => setOpenActionId(openActionId === row._id ? null : row._id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Action <ChevronDown size={12} />
                        </button>
                        {openActionId === row._id && (
                          <div className="absolute right-5 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={() => { navigate(`/billing/bill/${row._id}`); setOpenActionId(null); }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { navigate(`/billing/bill/${row._id}`); setOpenActionId(null); }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
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