import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  getMaterialRequisitions,
  deleteMaterialRequisition,
  convertRequisitionToPurchase,
  convertRequisitionToPurchaseOrder,
  convertRequisitionToRfq,
} from '../api/materialRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle, RefreshCw, Search, ClipboardList, Paperclip } from 'lucide-react';

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';

export default function MaterialRequisitionList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);
  const [selected, setSelected] = useState([]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [company, setCompany] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMaterialRequisitions({
        from, to, company, supplier: filterSupplier, project: filterProject,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  }, [from, to, company, filterSupplier, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/customers').then((res) => setSuppliers(asArray(res))).catch(() => {});
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this requisition?')) return;
    try {
      await deleteMaterialRequisition(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  async function handleConvert(row, kind) {
    const fn = { purchase: convertRequisitionToPurchase, po: convertRequisitionToPurchaseOrder, rfq: convertRequisitionToRfq }[kind];
    try {
      await fn(row.id);
      await loadRows();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Conversion failed');
    }
    setOpenActionId(null);
  }

  async function handleBulkConvert(kind) {
    if (selected.length === 0) return alert('Select at least one requisition');
    const fn = { purchase: convertRequisitionToPurchase, po: convertRequisitionToPurchaseOrder, rfq: convertRequisitionToRfq }[kind];
    for (const id of selected) {
      try { await fn(id); } catch { /* continue with remaining rows */ }
    }
    setSelected([]);
    await loadRows();
  }

  function toggleSelectAll(checked) {
    setSelected(checked ? paged.map((r) => r.id) : []);
  }
  function toggleSelectOne(id, checked) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.reference, r.supplier?.name, r.project?.name]
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
                { label: 'Requisition', to: '/requisition-module/material-requisition-list' },
                { label: 'Material Requisition List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Material Requisition List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track material requisitions and convert them to purchases</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkConvert('po')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple PO Convert
            </button>
            <button
              onClick={() => handleBulkConvert('rfq')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple RFQ Convert
            </button>
            <button
              onClick={() => handleBulkConvert('purchase')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple Purchase Convert
            </button>
            <button
              onClick={() => navigate('/requisition-module/material-requisition-add')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <PlusCircle size={16} strokeWidth={2.5} /> New Material Requisition
            </button>
          </div>
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

        {/* Filters card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Select Date</label>
              <div className="flex gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Somikoron IT Ltd" />
            </div>
            <div>
              <label className={labelCls}>Supplier</label>
              <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className={inputCls}>
                <option value="">Select an option</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Project</label>
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={inputCls}>
                <option value="">Select value</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
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
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={selected.length > 0 && selected.length === paged.length} className="rounded border-slate-300" />
                  </th>
                  {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Code', 'Ref', 'Date',
                    'Demand Date', 'Added By', 'Approval Layer', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or add a new requisition.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-4 py-3.5">
                        <input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => toggleSelectOne(row.id, e.target.checked)} className="rounded border-slate-300" />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.projectType || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{row.titleOfWork || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.reference || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmtDate(row.demandDate)}</td>
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
                        {row.attachment ? (
                          <a href={row.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                            <Paperclip size={12} /> File
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3.5 relative">
                        <button
                          onClick={() => setOpenActionId(openActionId === row.id ? null : row.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                        >
                          Action <ChevronDown size={12} />
                        </button>
                        {openActionId === row.id && (
                          <div className="absolute right-4 mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-lg shadow-slate-900/10 z-10 overflow-hidden">
                            <button onClick={() => { navigate(`/requisition-module/material-requisition-add/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">View</button>
                            <button onClick={() => { navigate(`/requisition-module/material-requisition-add/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">Edit</button>
                            <button onClick={() => handleConvert(row, 'purchase')} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">Convert To Purchase</button>
                            <button onClick={() => handleConvert(row, 'po')} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">Convert To Purchase Order</button>
                            <button onClick={() => handleConvert(row, 'rfq')} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">Convert To RFQ</button>
                            <button onClick={() => handleDelete(row)} className="w-full text-left px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors">Delete</button>
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