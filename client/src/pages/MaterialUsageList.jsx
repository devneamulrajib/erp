import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getMaterialUsages, deleteMaterialUsage } from '../api/materialUsage';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Copy, PlusCircle } from 'lucide-react';

function num(v) { return Number(v) || 0; }

export default function MaterialUsageList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterTitleOfWork, setFilterTitleOfWork] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMaterialUsages({ from, to, project: filterProject, site: filterSite });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load material usage');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterProject, filterSite]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
  }, []);

  // No dedicated "Title/Name of Work" master list exists yet, so the filter
  // options are derived from whatever titles are already present in the
  // loaded rows.
  const titleOfWorkOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.titleOfWork) set.add(r.titleOfWork); });
    return Array.from(set).sort();
  }, [rows]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this material usage entry?')) return;
    try {
      await deleteMaterialUsage(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  const filtered = rows.filter((r) => {
    if (filterTitleOfWork && r.titleOfWork !== filterTitleOfWork) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.purchaseRef, r.project?.name, r.employee, r.titleOfWork]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const subtotalSum = filtered.reduce((sum, r) => sum + num(r.subtotal), 0);
  const grandTotalSum = filtered.reduce((sum, r) => sum + num(r.grandTotal), 0);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Inventory', to: '/inventory-module/material_usage' },
            { label: 'Material Usage' },
          ]}
        />
        <button
          onClick={() => navigate('/inventory-module/materialusage')}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <PlusCircle size={15} /> New Material Usage
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Company</label>
            <select disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500">
              <option>Somikoron IT Ltd</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Site</label>
            <select value={filterSite} onChange={(e) => { setFilterSite(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title/Name of Work</label>
            <select value={filterTitleOfWork} onChange={(e) => { setFilterTitleOfWork(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Title/Name of Work</option>
              {titleOfWorkOptions.map((t) => <option key={t} value={t}>{t}</option>)}
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
                {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Worker/Staff Name', 'Code',
                  'Purchase/GRN', 'Date', 'Sub Total', 'Grand Total', 'Added By', 'Attachment',
                  'Approval', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={14} className="text-center py-8 text-gray-400">No entries found</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.titleOfWork || '-'}</td>
                    <td className="px-3 py-2">{row.employee || '-'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.purchaseRef || '-'}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{num(row.subtotal).toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium">{num(row.grandTotal).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.addedBy || '-'}</td>
                    <td className="px-3 py-2">
                      {row.attachment ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                    </td>
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
                      <div className="flex items-center gap-1.5">
                        <button title="Copy" className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded">
                          <Copy size={14} />
                        </button>
                        <button title="Edit" onClick={() => navigate(`/inventory-module/materialusage/${row._id}`)} className="p-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded">
                          <Pencil size={14} />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(row)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paged.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={8} className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2">{subtotalSum.toLocaleString()}</td>
                  <td className="px-3 py-2">{grandTotalSum.toLocaleString()}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
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