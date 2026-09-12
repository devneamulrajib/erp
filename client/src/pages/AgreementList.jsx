import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Copy, Plus, Search, ChevronDown, FileText, Eye, Loader2, Download } from 'lucide-react';

export default function AgreementList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await api.get('/agreements');
      setRows(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load agreements.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this agreement?')) return;
    try {
      await api.delete(`/agreements/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete agreement.');
    }
  }

  async function handleDuplicate(row) {
    try {
      const res = await api.post(`/agreements/${row.id}/duplicate`);
      setRows((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate agreement.');
    }
  }

  async function handleDownloadPdf(row) {
    setDownloadingId(row.id);
    try {
      const res = await api.get(`/agreements/${row.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(row.reference || `agreement-${row.id}`).replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF.');
    } finally {
      setDownloadingId(null);
    }
  }

  function formatDate(d) {
    if (!d) return '—';
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

      <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module/agreement_list' },
                { label: 'Agreement List' },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Agreements</h1>
            <p className="text-sm text-gray-500 mt-1">Manage agreements created across your projects</p>
          </div>

          <button
            onClick={() => navigate('/accounts-module/agreement_list_add')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Agreement
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Agreements</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Matching Search</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Showing</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {paged.length} / {filtered.length}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-500">entries</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Select Columns
                <ChevronDown size={14} />
              </button>

              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search agreements..."
                  className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  {['ID', 'Date', 'Name', 'Project', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" />
                      Loading agreements...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-gray-400">#{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-1">
                          {formatDate(row.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/accounts-module/agreement_list_view/${row.id}`)}
                          className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          <FileText size={14} className="text-indigo-400" />
                          {row.reference || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.project || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => navigate(`/accounts-module/agreement_list_view/${row.id}`)}
                            title="View"
                            className="bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(row)}
                            disabled={downloadingId === row.id}
                            title="Download PDF"
                            className="bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors disabled:opacity-50"
                          >
                            {downloadingId === row.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/accounts-module/agreement_list_add/${row.id}`)}
                            title="Edit"
                            className="bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(row)}
                            title="Duplicate"
                            className="bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            title="Delete"
                            className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
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

          <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 flex-wrap gap-3">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:hover:text-gray-400"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white">{page}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:hover:text-gray-400"
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