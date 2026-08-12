import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import { getAssets, deleteAsset } from '../api/asset';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AssetListPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAssets();
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter((a) => {
    if (search && !(a.item?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete(id) {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await deleteAsset(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600">Accounts Module</span>
            <span>&gt;</span>
            <span className="text-gray-700">Asset List</span>
          </div>
          <button
            onClick={() => navigate('/accounts-module/asset_list_add')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            + Add New Asset
          </button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 text-sm">
            Search:
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-1.5"
            />
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-500 text-white text-left text-sm">
              <th className="px-3 py-2 font-medium">SL</th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium">LOCATION</th>
              <th className="px-3 py-2 font-medium">ACQUISITION DATE</th>
              <th className="px-3 py-2 font-medium">ORIGINAL VALUE</th>
              <th className="px-3 py-2 font-medium">METHOD</th>
              <th className="px-3 py-2 font-medium">BOOK VALUE</th>
              <th className="px-3 py-2 font-medium">DEPRECIABLE VALUE</th>
              <th className="px-3 py-2 font-medium">STATUS</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((asset, i) => (
              <tr key={asset._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{asset.item?.name || ''}</td>
                <td className="px-3 py-2">{asset.location}</td>
                <td className="px-3 py-2">{fmtDate(asset.acquisitionDate)}</td>
                <td className="px-3 py-2">{asset.originalValue}</td>
                <td className="px-3 py-2">{asset.method}</td>
                <td className="px-3 py-2">{asset.bookValue}</td>
                <td className="px-3 py-2">{asset.depreciableValue}</td>
                <td className="px-3 py-2">{asset.status}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => navigate(`/accounts-module/asset_list_add/${asset._id}`)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-md"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(asset._id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
            {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-md ${n === page ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}