import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceRequisitions, deleteServiceRequisition } from '../api/serviceRequisition';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Eye, Pencil, Trash2, PlusCircle } from 'lucide-react';

function num(v) { return Number(v) || 0; }

export default function ServiceRequisitionList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getServiceRequisitions();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load service requisitions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this requisition?')) return;
    try {
      await deleteServiceRequisition(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
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

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Requisition', to: '/requisition-module/service-work-requisition-list' },
            { label: 'Service/Work Requisition List' },
          ]}
        />
        <button
          onClick={() => navigate('/requisition-module/service-work-requisition-add')}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <PlusCircle size={15} /> New Service/Work Requisition
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="flex items-center justify-between mb-3 mt-4">
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
                {['ID', 'Project Type', 'Project', 'Code', 'Date', 'Grand Total', 'Added By', 'Approval Layer', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No entries found</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 font-medium">{num(row.grandTotal).toLocaleString()}</td>
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
                    <td className="px-3 py-2 relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === row._id ? null : row._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs"
                      >
                        Action <Pencil size={0} className="hidden" />
                      </button>
                      {openActionId === row._id && (
                        <div className="absolute right-3 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button onClick={() => { navigate(`/requisition-module/service-work-requisition-add/${row._id}`); setOpenActionId(null); }} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-xs hover:bg-gray-50">
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => { navigate(`/requisition-module/service-work-requisition-add/${row._id}`); setOpenActionId(null); }} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-xs hover:bg-gray-50">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(row)} className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                            <Trash2 size={12} /> Delete
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