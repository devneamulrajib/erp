import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Search, Boxes, Plus } from 'lucide-react';
import { getAssets, deleteAsset } from '../api/asset';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AssetListPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getAssets();
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets', err);
      setError('Failed to load assets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const filtered = assets.filter((a) => {
    if (search && !(a.item?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete(asset) {
    if (!window.confirm(`Delete asset "${asset.item?.name || ''}"?`)) return;
    setDeletingId(asset.id);
    try {
      await deleteAsset(asset.id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
  const fmtVal = (v) => (v == null ? '-' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }));

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module' },
                { label: 'Asset List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Asset List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track fixed assets, depreciation, and current book value</p>
          </div>
          <button
            onClick={() => navigate('/accounts-module/asset_list_add')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add New Asset
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Assets</div>
            <div className="text-xl font-semibold text-slate-900">{assets.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pageRows.length} / {filtered.length}</div>
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
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Location</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Acquisition Date</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Original Value</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Method</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Book Value</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Depreciable Value</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Boxes size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your search, or add a new asset.</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((asset, i) => (
                  <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{asset.item?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{asset.location || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmtDate(asset.acquisitionDate)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmtVal(asset.originalValue)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{asset.method || '-'}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{fmtVal(asset.bookValue)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{fmtVal(asset.depreciableValue)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-600/10">
                        {asset.status || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/accounts-module/asset_list_add/${asset.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(asset)}
                          disabled={deletingId === asset.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{(page - 1) * pageSize + pageRows.length}</span> of{' '}
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