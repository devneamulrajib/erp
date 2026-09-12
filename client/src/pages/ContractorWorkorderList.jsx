import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContractorWorkorders, deleteContractorWorkorder } from '../api/contractorWorkorder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { PlusCircle, Search, LayoutGrid, Paperclip, Pencil, Eye, Trash2 } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function rid(o) { return o?.id ?? o?._id ?? ''; }

export default function ContractorWorkorderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContractorWorkorders();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this work order?')) return;
    try {
      await deleteContractorWorkorder(rid(row));
      setRows((prev) => prev.filter((r) => rid(r) !== rid(row)));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.refInvoiceNo, r.supplier?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const HEADERS = ['ID', 'Contractor Name', 'W/O No', 'Ref Invoice No', 'Date', 'Sub Total', 'VAT', 'Discount',
    'Grand Total', 'Added By', 'Attachment', 'Action'];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-full mx-auto px-3 sm:px-5 py-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/contractor-work-order-list' },
                { label: 'Contractor Work Order List' },
              ]}
            />
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Contractor Work Orders</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage contractor work orders and their billing details</p>
          </div>
          <button
            onClick={() => navigate('/billing/contractor-workorder')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors shrink-0"
          >
            <PlusCircle size={16} strokeWidth={2.5} />
            Contractor Work Order
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 max-w-xl">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Orders</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{paged.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">Excel</button>
              <button onClick={() => window.print()} className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">PDF</button>
              <div className="flex items-center gap-2 text-sm text-slate-500 ml-1">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search work orders..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-56 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {HEADERS.map((h) => (
                    <th key={h} className={`px-3 py-2.5 font-medium text-[11px] uppercase tracking-wide ${h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-14 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={26} strokeWidth={1.5} />
                        <p className="text-sm">No work orders found. Try adjusting your search, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={rid(row)} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top text-xs sm:text-sm">
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">#{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{row.supplier?.name || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 text-[11px] font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.code}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.refInvoiceNo || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{row.date}</td>
                      <td className="px-3 py-3 text-slate-600">{num(row.subtotal).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-600">{num(row.vatAmount).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-600">{num(row.discount).toLocaleString()}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-600">{row.addedBy || '-'}</td>
                      <td className="px-3 py-3">
                        {row.attachment ? (
                          <a href={row.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2">
                            <Paperclip size={12} /> File
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/billing/contractor-workorder/${rid(row)}`)}
                            title="Edit"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => navigate(`/billing/contractor-workorder/${rid(row)}?view=1`)}
                            title="View"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
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