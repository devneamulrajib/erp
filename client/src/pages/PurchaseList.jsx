import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getPurchases, deletePurchase } from '../api/purchase';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Eye, PlusCircle } from 'lucide-react';

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
    api.get('/customers').then((res) => setSuppliers(res.data)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  async function handleDelete(row) {
    if (!window.confirm('Delete this purchase?')) return;
    try {
      await deletePurchase(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
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
  const grandTotalSum = filtered.reduce((sum, r) => sum + num(r.grandTotal), 0);
  const dueSum = filtered.reduce((sum, r) => sum + num(r.due), 0);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Inventory', to: '/inventory-module/purchase-list' },
            { label: 'Purchase List' },
          ]}
        />
        <button
          onClick={() => navigate('/inventory-module/purchase')}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <PlusCircle size={15} /> Create New Purchase
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
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
              <option value="">Select Project</option>
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
                {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Supplier Name', 'Code',
                  'Reference', 'Date', 'Sub Total', 'Discount', 'Grand Total', 'Paid', 'Due',
                  'Attachment', 'Note', 'Added By', 'Approval Layer', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={18} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={18} className="text-center py-8 text-gray-400">No entries found</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.titleOfWork || '-'}</td>
                    <td className="px-3 py-2">{row.supplier?.name || '-'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.reference || '-'}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{num(row.subtotal).toLocaleString()}</td>
                    <td className="px-3 py-2">{num(row.discount).toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium">{num(row.grandTotal).toLocaleString()}</td>
                    <td className="px-3 py-2 text-emerald-600">{num(row.paid).toLocaleString()}</td>
                    <td className="px-3 py-2 text-red-500">{num(row.due).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {row.attachment ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                    </td>
                    <td className="px-3 py-2">{row.note || '-'}</td>
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
                      <div className="flex items-center gap-1.5">
                        <button
                          title="Material Usages"
                          onClick={() => navigate(`/inventory-module/purchase_to_materialusage/${row._id}`)}
                          className="px-2 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs whitespace-nowrap"
                        >
                          +Material Usages
                        </button>
                        <button title="Edit" onClick={() => navigate(`/inventory-module/purchase/${row._id}`)} className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded">
                          <Pencil size={14} />
                        </button>
                        <button title="View" onClick={() => navigate(`/inventory-module/purchase/${row._id}`)} className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded">
                          <Eye size={14} />
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
                  <td colSpan={10} className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2">{grandTotalSum.toLocaleString()}</td>
                  <td></td>
                  <td className="px-3 py-2">{dueSum.toLocaleString()}</td>
                  <td colSpan={5}></td>
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