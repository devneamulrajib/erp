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
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle, RefreshCw } from 'lucide-react';

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
    api.get('/customers').then((res) => setSuppliers(res.data)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  async function handleDelete(row) {
    if (!window.confirm('Delete this requisition?')) return;
    try {
      await deleteMaterialRequisition(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  async function handleConvert(row, kind) {
    const fn = { purchase: convertRequisitionToPurchase, po: convertRequisitionToPurchaseOrder, rfq: convertRequisitionToRfq }[kind];
    try {
      await fn(row._id);
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
    setSelected(checked ? paged.map((r) => r._id) : []);
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

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4 flex-wrap gap-2">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Requisition', to: '/requisition-module/material-requisition-list' },
            { label: 'Material Requisition List' },
          ]}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => handleBulkConvert('po')} className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium px-3 py-2 rounded-md">
            <RefreshCw size={13} /> Multiple PO Convert
          </button>
          <button onClick={() => handleBulkConvert('rfq')} className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium px-3 py-2 rounded-md">
            <RefreshCw size={13} /> Multiple RFQ Convert
          </button>
          <button onClick={() => handleBulkConvert('purchase')} className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium px-3 py-2 rounded-md">
            <RefreshCw size={13} /> Multiple Purchase Convert
          </button>
          <button
            onClick={() => navigate('/requisition-module/material-requisition-add')}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            <PlusCircle size={15} /> New Material Requisition
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Somikoron IT Ltd" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Supplier</label>
            <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select an option</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select value</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                <th className="px-3 py-2 text-left font-medium">
                  <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={selected.length > 0 && selected.length === paged.length} />
                </th>
                {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Code', 'Ref', 'Date',
                  'Demand Date', 'Added By', 'Approval Layer', 'Attachment', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">No entries found</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.includes(row._id)} onChange={(e) => toggleSelectOne(row._id, e.target.checked)} />
                    </td>
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.titleOfWork || '-'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.reference || '-'}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.demandDate || '-'}</td>
                    <td className="px-3 py-2">{row.addedBy || '-'}</td>
                    <td className="px-3 py-2">
                      {(row.approvals || []).every((a) => a.approved) && row.approvals?.length > 0 && (
                        <div className="text-emerald-600 text-xs">✓ All Approvals Completed</div>
                      )}
                      {(row.approvals || []).map((a, idx) => (
                        <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                          {a.approved ? '✓' : '✗'} {a.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      {row.attachment ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                    </td>
                    <td className="px-3 py-2 relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === row._id ? null : row._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs"
                      >
                        Action <ChevronDown size={12} />
                      </button>
                      {openActionId === row._id && (
                        <div className="absolute right-3 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button onClick={() => { navigate(`/requisition-module/material-requisition-add/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">View</button>
                          <button onClick={() => { navigate(`/requisition-module/material-requisition-add/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Edit</button>
                          <button onClick={() => handleConvert(row, 'purchase')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Convert To Purchase</button>
                          <button onClick={() => handleConvert(row, 'po')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Convert To Purchase Order</button>
                          <button onClick={() => handleConvert(row, 'rfq')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Convert To RFQ</button>
                          <button onClick={() => handleDelete(row)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}