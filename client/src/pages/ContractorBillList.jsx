import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getContractorBills, getContractorBill, deleteContractorBill } from '../api/contractorBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  ChevronDown, Plus, Search, LayoutGrid, Paperclip, CheckCircle2, XCircle,
  Eye, Pencil, Trash2, Download, Loader2, X,
} from 'lucide-react';

function num(v) { return Number(v) || 0; }

// Backend serves uploaded files from its own origin (e.g. localhost:5000),
// not the Vite dev server (localhost:5173) — so relative "/uploads/..."
// paths must be prefixed with the API's origin before use as a link.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const fileUrl = (path) => (path ? (path.startsWith('http') ? path : `${API_ORIGIN}${path}`) : null);

function statusOf(row) {
  const grand = num(row.grandTotal);
  const due = num(row.due);
  const paid = num(row.paid);
  if (grand > 0 && due <= 0) return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' };
  if (paid > 0) return { label: 'Partial', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' };
  return { label: 'Unpaid', cls: 'bg-red-50 text-red-700 ring-red-600/20' };
}

export default function ContractorBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterLedger, setFilterLedger] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getContractorBills({ from, to, party: filterParty, ledger: filterLedger, project: filterProject });
      const list = Array.isArray(res) ? res : (res?.rows || res?.bills || res?.data || []);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load contractor bills');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, filterParty, filterLedger, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    getParties().then((res) => {
      const list = Array.isArray(res) ? res : (res?.rows || res?.parties || res?.data || []);
      setParties(Array.isArray(list) ? list : []);
    }).catch(() => {});
    getChartOfAccounts().then((res) => {
      const body = res?.data ?? res;
      setLedgers(Array.isArray(body) ? body : (body?.rows || body?.data || []));
    }).catch(() => {});
    api.get('/projects').then((res) => setProjects(Array.isArray(res.data) ? res.data : (res.data?.rows || []))).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, filterStatus]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this contractor bill?')) return;
    try {
      await deleteContractorBill(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  async function handleDownloadPdf(row) {
    setDownloadingId(row.id);
    setOpenActionId(null);
    try {
      const res = await api.get(`/contractor-bill/${row.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(row.code || `bill-${row.id}`).replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to download PDF.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleView(row) {
    setOpenActionId(null);
    setViewLoading(true);
    setViewing({ id: row.id });
    try {
      const full = await getContractorBill(row.id);
      setViewing(full);
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to load bill details.');
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterStatus && statusOf(r).label !== filterStatus) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.titleOfWork, r.Party?.name, r.Project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  }), [rows, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );
  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    grandTotal: acc.grandTotal + num(r.grandTotal),
    paid: acc.paid + num(r.paid),
    due: acc.due + num(r.due),
  }), { grandTotal: 0, paid: 0, due: 0 }), [filtered]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/vendor_bill_list' },
                { label: 'Contractor/Supplier Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Contractor/Supplier Bills</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track contractor and supplier billing across your projects</p>
          </div>
          <button
            onClick={() => navigate('/billing/contract_bill')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Contractor/Supplier Bill
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Bills</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Grand Total</div>
            <div className="text-xl font-semibold text-slate-900">{totals.grandTotal.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Paid</div>
            <div className="text-xl font-semibold text-emerald-600">{totals.paid.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due</div>
            <div className="text-xl font-semibold text-red-600">{totals.due.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Contractor/Supplier</label>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select One Option</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Ledger</label>
              <select
                value={filterLedger}
                onChange={(e) => setFilterLedger(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Chart Of Account</option>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">All</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
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
                placeholder="Search bills..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Contractor Name', 'DR Ledger', 'Code',
                    'Date', 'Grand Total', 'Paid', 'Due', 'Status', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No contractor/supplier bills found. Try adjusting your filters, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const status = statusOf(row);
                    const attachmentHref = fileUrl(row.attachment);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-5 py-3.5 text-slate-700">{row.projectType || '-'}</td>
                        <td className="px-5 py-3.5 text-slate-700">{row.Project?.name || '-'}</td>
                        <td className="px-5 py-3.5 text-slate-700">{row.titleOfWork || '-'}</td>
                        <td className="px-5 py-3.5 text-slate-700">{row.Party?.name || '-'}</td>
                        <td className="px-5 py-3.5 text-slate-700">{row.ChartOfAccount?.name || '-'}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                            {row.code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{row.date}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{num(row.grandTotal).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-700">{num(row.paid).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-700">{num(row.due).toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{row.addedBy || '-'}</td>
                        <td className="px-5 py-3.5">
                          {(row.approvals || []).map((a, idx) => (
                            <div key={idx} className={`flex items-center gap-1 text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                              {a.approved ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {a.name}
                            </div>
                          ))}
                        </td>
                        <td className="px-5 py-3.5">
                          {attachmentHref ? renderAttachmentLink(attachmentHref) : '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleView(row)}
                              title="View"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(row)}
                              disabled={downloadingId === row.id}
                              title="Download PDF"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
                            >
                              {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            </button>
                            <button
                              onClick={() => navigate(`/billing/contract_bill/${row.id}`)}
                              title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-medium bg-slate-50/50">
                    <td colSpan={8} className="px-5 py-3 text-right text-slate-500 text-xs uppercase tracking-wide">Total:</td>
                    <td className="px-5 py-3 text-slate-900">{totals.grandTotal.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-900">{totals.paid.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-900">{totals.due.toLocaleString()}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
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

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-[100000] overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bill Details</h2>
                {!viewLoading && <p className="text-sm text-slate-500 mt-0.5">{viewing.code}</p>}
              </div>
              <button onClick={() => setViewing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {viewLoading ? (
                <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <ViewField label="Date" value={viewing.date} />
                    <ViewField label="Contractor/Supplier" value={viewing.Party?.name} />
                    <ViewField label="Project" value={viewing.Project?.name} />
                    <ViewField label="Ledger" value={viewing.ChartOfAccount?.name} />
                    <ViewField label="Project Type" value={viewing.projectType} />
                    <ViewField label="Title/Name of Work" value={viewing.titleOfWork} />
                    <ViewField label="Ref W/O No." value={viewing.refWoNo} />
                    <ViewField label="Status">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusOf(viewing).cls}`}>
                        {statusOf(viewing).label}
                      </span>
                    </ViewField>
                  </div>

                  {viewing.attachment && (
                    <div className="mb-6">
                      {renderAttachmentLink(fileUrl(viewing.attachment))}
                    </div>
                  )}

                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Items</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          {['Item', 'Qty', 'Rate', 'Amount'].map((h) => (
                            <th key={h} className="px-4 py-2 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(viewing.ContractorBillItems || []).length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">No items</td></tr>
                        ) : (
                          (viewing.ContractorBillItems || []).map((it, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 text-slate-700">{it.itemName || 'Item'}</td>
                              <td className="px-4 py-2.5 text-slate-700">{it.quantity}</td>
                              <td className="px-4 py-2.5 text-slate-700">{num(it.rate).toLocaleString()}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-900">{num(it.amount).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Payments</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          {['Date', 'Method', 'Amount'].map((h) => (
                            <th key={h} className="px-4 py-2 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(viewing.ContractorBillPayments || []).length === 0 ? (
                          <tr><td colSpan={3} className="text-center py-6 text-slate-400 text-sm">No payments</td></tr>
                        ) : (
                          (viewing.ContractorBillPayments || []).map((p, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 text-slate-700">{p.date}</td>
                              <td className="px-4 py-2.5 text-slate-700">{p.paymentMethod}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-900">{num(p.amount).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <ViewField label="Subtotal" value={num(viewing.subtotal).toLocaleString()} />
                    <ViewField label="VAT Amount" value={num(viewing.vatAmount).toLocaleString()} />
                    <ViewField label="Grand Total" value={num(viewing.grandTotal).toLocaleString()} bold />
                    <ViewField label="Due" value={num(viewing.due).toLocaleString()} accent="text-red-600" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setViewing(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Close</button>
              {!viewLoading && (
                <button
                  onClick={() => { navigate(`/billing/contract_bill/${viewing.id}`); }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Kept as a plain function (not JSX-in-JSX) so this file has zero risk of a
// stray copy-paste dropping the opening anchor tag.
function renderAttachmentLink(url) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2"
    >
      <Paperclip size={13} /> File
    </a>
  );
}

function ViewField({ label, value, children, bold, accent }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      {children || <p className={`text-sm ${bold ? 'font-semibold text-slate-900' : accent || 'text-slate-800'}`}>{value || '\u2014'}</p>}
    </div>
  );
}