import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, deleteBill } from '../api/bill';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle } from 'lucide-react';

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
    a.href = url;
    a.download = 'bill_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.refWoNo, r.customer?.name, r.project?.name]
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
            { label: 'Billing', to: '/billing/bill_list' },
            { label: 'Invoice/Bill List' },
          ]}
        />
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/billing/bill')}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            <PlusCircle size={15} /> New Bill/Invoice
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            Back to Previous
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">Excel</button>
            <button onClick={() => window.print()} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">PDF</button>
            <span className="text-gray-500 text-sm">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500 text-sm">entries</span>
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
                {['ID', 'Project Type', 'Project', 'Customer Name', 'Code', 'Ref', 'Date',
                  'Grand Total', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.customer?.name || '-'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.refWoNo || '-'}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 font-medium">{num(row.grandTotal).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.addedBy || '-'}</td>
                    <td className="px-3 py-2">
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
                        <div className="absolute right-3 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button onClick={() => { navigate(`/billing/bill/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Edit</button>
                          <button onClick={() => { navigate(`/billing/bill/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">View</button>
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