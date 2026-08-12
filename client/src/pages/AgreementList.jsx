import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Copy } from 'lucide-react';

export default function AgreementList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    try {
      const res = await api.get('/agreements');
      setRows(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load agreements.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this agreement?')) return;
    try {
      await api.delete(`/agreements/${row._id}`);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete agreement.');
    }
  }

  async function handleDuplicate(row) {
    try {
      const res = await api.post(`/agreements/${row._id}/duplicate`);
      setRows((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate agreement.');
    }
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (r.reference || '').toLowerCase().includes(q) || (r.project || '').toLowerCase().includes(q);
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
            { label: 'Accounts Module', to: '/accounts-module/agreement_list' },
            { label: 'Agreement List' },
          ]}
        />
        <button
          onClick={() => navigate('/accounts-module/agreement_list_add')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Agreement Add
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-2 text-left font-medium">SL</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Project</th>
                <th className="px-4 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-2">{formatDate(row.date)}</td>
                    <td className="px-4 py-2">{row.reference}</td>
                    <td className="px-4 py-2">{row.project}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/accounts-module/agreement_list_add/${row._id}`)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(row)}
                          className="bg-indigo-400 hover:bg-indigo-500 text-white p-1.5 rounded"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
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
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}