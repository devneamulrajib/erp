import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import Modal from '../components/Modal';
import {
  getBrands, getNextBrandCode, createBrand, updateBrand, deleteBrand,
} from '../api/brand';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = { code: '', name: '' };

export default function BrandPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBrands();
      setBrands(data);
    } catch (err) {
      console.error('Failed to load brands', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = brands.filter((b) => {
    if (search && !b.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function openAddModal() {
    setEditingId(null);
    const { data } = await getNextBrandCode();
    setForm({ code: data.code, name: '' });
    setModalOpen(true);
  }

  function openEditModal(brand) {
    setEditingId(brand._id);
    setForm({ code: brand.code, name: brand.name });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateBrand(editingId, form);
      } else {
        await createBrand(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save brand', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this brand?')) return;
    try {
      await deleteBrand(id);
      await load();
    } catch (err) {
      console.error('Failed to delete brand', err);
    }
  }

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <Link to="/dashboard/inventory" className="text-indigo-600 hover:underline">Inventory</Link>
            <span>&gt;</span>
            <span className="text-gray-700">Brand List</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openAddModal}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              + Add Brand
            </button>
            <Link
              to="/dashboard/inventory"
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              <ArrowLeft size={15} /> Back to Previous
            </Link>
          </div>
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
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">CODE</th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((brand, i) => (
              <tr key={brand._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{brand.code}</td>
                <td className="px-3 py-2">{brand.name}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(brand)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-md"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(brand._id)}
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

      <Modal open={modalOpen} title="Brand" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-md"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}