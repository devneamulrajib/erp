import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceRequisitions, getServiceRequisition, deleteServiceRequisition } from '../api/serviceRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Eye, Pencil, Trash2, PlusCircle, Search, ClipboardList, X } from 'lucide-react';

function num(v) { return Number(v) || 0; }

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

export default function ServiceRequisitionList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getServiceRequisitions();
      setRows(asArray(data));
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load service requisitions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  useEffect(() => {
    if (!viewId) return;
    setViewLoading(true);
    setViewError('');
    setViewData(null);
    getServiceRequisition(viewId)
      .then((data) => setViewData(data))
      .catch((e) => setViewError(e.response?.data?.message || e.message || 'Failed to load requisition'))
      .finally(() => setViewLoading(false));
  }, [viewId]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this requisition?')) return;
    setDeletingId(row.id);
    try {
      await deleteServiceRequisition(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.project?.name, r.titleOfWork]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

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
                { label: 'Requisition', to: '/requisition-module/service-work-requisition-list' },
                { label: 'Service/Work Requisition List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Service/Work Requisition List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track service and work requisitions across projects</p>
          </div>
          <button
            onClick={() => navigate('/requisition-module/service-work-requisition-add')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <PlusCircle size={16} strokeWidth={2.5} /> New Service/Work Requisition
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Requisitions</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{paged.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
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
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requisitions..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project Type', 'Project', 'Code', 'Date', 'Grand Total', 'Added By', 'Approval Layer', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your search, or add a new requisition.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.projectType || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.addedBy || '-'}</td>
                      <td className="px-4 py-3.5">
                        {(row.approvals || []).length > 0 && (row.approvals || []).every((a) => a.approved) && (
                          <div className="text-emerald-600 text-xs font-medium">✓ All Approvals Completed</div>
                        )}
                        {(row.approvals || []).map((a, idx) => (
                          <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.approved ? '✓' : '✗'} {a.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewId(row.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/requisition-module/service-work-requisition-add/${row.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={deletingId === row.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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

      {viewId && (
        <ViewModal
          onClose={() => { setViewId(null); setViewData(null); setViewError(''); }}
          loading={viewLoading}
          error={viewError}
          data={viewData}
          fmtDate={fmtDate}
        />
      )}
    </div>
  );
}

function ViewModal({ onClose, loading, error, data, fmtDate }) {
  const items = data?.items || [];
  const subtotal = items.reduce((sum, it) => sum + num(it.rate) * num(it.qtyDays), 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Service/Work Requisition</h2>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          ) : data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <InfoField label="Code" value={data.code} />
                <InfoField label="Date" value={fmtDate(data.date)} />
                <InfoField label="Project Type" value={data.projectType} />
                <InfoField label="Project" value={data.project?.name} />
                <InfoField label="Title/Name of Work" value={data.titleOfWork} />
                <InfoField label="Task" value={data.task} />
                <InfoField label="Site" value={data.site?.name} />
                <InfoField label="Added By" value={data.addedBy} />
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                      {['Code', 'Name', 'Unit', 'Qty/Days', 'Rate', 'Details', 'Amount'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No items</td></tr>
                    ) : items.map((it, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-slate-600">{it.code}</td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{it.name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{typeof it.unit === 'object' ? (it.unit?.name || '-') : (it.unit || '-')}</td>
                        <td className="px-3 py-2.5 text-slate-600">{it.qtyDays}</td>
                        <td className="px-3 py-2.5 text-slate-600">{num(it.rate).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-slate-600">{it.details || '-'}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{(num(it.rate) * num(it.qtyDays)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-700 font-medium">Grand Total</span>
                    <span className="font-semibold text-slate-900">{num(data.grandTotal ?? subtotal).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-slate-800">{value || '-'}</div>
    </div>
  );
}