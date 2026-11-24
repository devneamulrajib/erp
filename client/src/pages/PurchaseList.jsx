import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getPurchases, deletePurchase } from '../api/purchase';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  Pencil, Trash2, Eye, PlusCircle, Plus, ShoppingCart, Receipt, Wallet, AlertCircle,
  Search, X, CheckCircle2, XCircle, Paperclip, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { KpiCard } from '../components/dashboard/DashboardKit';

function num(v) { return Number(v) || 0; }

export default function PurchaseList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPurchases({ from, to, supplier: filterSupplier, project: filterProject });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterSupplier, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    // Suppliers are Supplier contacts in Chart of Accounts (purchases.supplierId
    // belongs to ChartOfAccount), not rows from the Customers table.
    api.get('/chart-of-accounts', { params: { contactType: 'Supplier' } })
      .then((res) => setSuppliers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  // The API returns Sequelize rows (`id`, `supplierId`, `projectId`,
  // `PurchaseApprovals`); older Mongo-style fields (`_id`, `supplier`,
  // `project`, `approvals`) are still honoured if present.
  const rowId = (r) => r.id ?? r._id;
  const supplierName = useMemo(() => {
    const m = new Map(suppliers.map((s) => [String(s.id ?? s._id), s.name]));
    return (r) => r.supplier?.name || m.get(String(r.supplierId)) || '';
  }, [suppliers]);
  const projectName = useMemo(() => {
    const m = new Map(projects.map((p) => [String(p.id ?? p._id), p.name]));
    return (r) => r.project?.name || m.get(String(r.projectId)) || '';
  }, [projects]);
  const approvalsOf = (r) => r.approvals || r.PurchaseApprovals || [];

  async function handleDelete(row) {
    if (!window.confirm('Delete this purchase?')) return;
    try {
      await deletePurchase(rowId(row));
      setRows((prev) => prev.filter((r) => rowId(r) !== rowId(row)));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.reference, supplierName(r), projectName(r), r.titleOfWork]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const grandTotalSum = filtered.reduce((sum, r) => sum + num(r.grandTotal), 0);
  const paidSum = filtered.reduce((sum, r) => sum + num(r.paid), 0);
  const dueSum = filtered.reduce((sum, r) => sum + num(r.due), 0);
  const money = (v) => num(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const hasFilters = !!(from || to || filterSupplier || filterProject || search);

  function clearFilters() {
    setFrom(''); setTo(''); setFilterSupplier(''); setFilterProject(''); setSearch(''); setPage(1);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Inventory', to: '/inventory-module/purchase-list' },
                { label: 'Purchase List' },
              ]}
            />
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/30">
                <ShoppingCart size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Purchases</h1>
            </div>
            <p className="ml-12 mt-1 text-sm text-slate-500">Every purchase with its total, payment and approval status</p>
          </div>
          <button
            onClick={() => navigate('/inventory-module/purchase')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            <PlusCircle size={16} /> Create New Purchase
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Purchases" value={filtered.length} icon={ShoppingCart} accent="indigo" hint={hasFilters ? 'Matching filters' : 'All time'} loading={loading} />
          <KpiCard label="Grand Total" value={money(grandTotalSum)} icon={Receipt} accent="violet" loading={loading} />
          <KpiCard label="Paid" value={money(paidSum)} icon={Wallet} accent="emerald" loading={loading} />
          <KpiCard label="Due" value={money(dueSum)} icon={AlertCircle} accent="rose" loading={loading} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Code, reference, supplier, project"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">From</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">To</label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Supplier</label>
              <select value={filterSupplier} onChange={(e) => { setFilterSupplier(e.target.value); setPage(1); }} className="input">
                <option value="">All suppliers</option>
                {suppliers.map((s) => <option key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Project</label>
              <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1); }} className="input">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <X size={14} /> Clear
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="whitespace-nowrap bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  {['#', 'Purchase', 'Supplier / Project', 'Sub Total', 'Discount', 'Grand Total', 'Paid', 'Due', 'Status',
                    'Approval Layer', 'Details', 'Action'].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold ${['Sub Total', 'Discount', 'Grand Total', 'Paid', 'Due'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={12} className="py-12 text-center text-slate-400">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={12} className="py-12 text-center text-slate-400">No entries found</td></tr>
                ) : (
                  paged.map((row, i) => {
                    const approvals = approvalsOf(row);
                    const allApproved = approvals.length > 0 && approvals.every((a) => a.approved);
                    const due = num(row.due);
                    const status = due <= 0 ? 'Paid' : num(row.paid) > 0 ? 'Partial' : 'Unpaid';
                    const statusCls = status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : status === 'Partial'
                        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                        : 'bg-red-50 text-red-700 ring-red-600/20';
                    return (
                      <tr key={rowId(row)} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-400">{(page - 1) * pageSize + i + 1}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-mono text-xs font-semibold text-slate-800">{row.code}</div>
                          <div className="text-xs text-slate-500">{row.date || '-'}</div>
                          {row.reference && <div className="text-[11px] text-slate-400">Ref: {row.reference}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{supplierName(row) || '-'}</div>
                          <div className="text-xs text-slate-500">{projectName(row) || '-'}</div>
                          {row.titleOfWork && <div className="max-w-[220px] truncate text-[11px] text-slate-400" title={row.titleOfWork}>{row.titleOfWork}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{money(row.subtotal)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{money(row.discount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money(row.grandTotal)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-600">{money(row.paid)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-red-500">{money(row.due)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusCls}`}>{status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {allApproved && (
                            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 size={12} /> All Approvals Completed
                            </div>
                          )}
                          {approvals.map((a, idx) => (
                            <div key={idx} className={`flex items-center gap-1 text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                              {a.approved ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {a.name}
                            </div>
                          ))}
                          {approvals.length === 0 && <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <div>By {row.addedBy || '-'}</div>
                          {row.note && <div className="max-w-[200px] truncate" title={row.note}>{row.note}</div>}
                          {row.attachment && (
                            <a href={row.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                              <Paperclip size={11} /> File
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              title="Material Usages"
                              onClick={() => navigate(`/inventory-module/purchase_to_materialusage/${rowId(row)}`)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-cyan-50 px-2 py-1.5 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
                            >
                              <Plus size={12} /> Material Usages
                            </button>
                            <button title="View" onClick={() => navigate(`/inventory-module/purchase/${rowId(row)}`)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-600">
                              <Eye size={15} />
                            </button>
                            <button title="Edit" onClick={() => navigate(`/inventory-module/purchase/${rowId(row)}`)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                              <Pencil size={15} />
                            </button>
                            <button title="Delete" onClick={() => handleDelete(row)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {paged.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                    <td colSpan={5} className="px-4 py-3">TOTAL</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{money(grandTotalSum)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-600">{money(paidSum)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-red-500">{money(dueSum)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>
                · Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
