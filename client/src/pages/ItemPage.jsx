import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import Modal from '../components/Modal';
import { getItems, createItem, updateItem, deleteItem } from '../api/item';
import { getCategories } from '../api/category';
import { getBrands, getNextBrandCode, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = {
  category: '', brand: '', name: '', unit: '', purchasePrice: '', salePrice: '',
};
const EMPTY_BRAND_FORM = { code: '', name: '' };

export default function ItemPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState(EMPTY_BRAND_FORM);
  const [savingBrand, setSavingBrand] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
        getItems(), getCategories(), getBrands(), getUnits(),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
      setBrands(brandsRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error('Failed to load item data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) => {
    if (search && !it.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      category: item.category?._id || '',
      brand: item.brand?._id || '',
      name: item.name,
      unit: item.unit,
      purchasePrice: item.purchasePrice || '',
      salePrice: item.salePrice || '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.category || !form.name || !form.unit) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateItem(editingId, form);
      } else {
        await createItem(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save item', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteItem(id);
      await load();
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  }

  async function openBrandModal() {
    const { data } = await getNextBrandCode();
    setBrandForm({ code: data.code, name: '' });
    setBrandModalOpen(true);
  }

  async function handleBrandSubmit(e) {
    e.preventDefault();
    if (!brandForm.name) return;
    setSavingBrand(true);
    try {
      const { data: newBrand } = await createBrand(brandForm);
      const { data: freshBrands } = await getBrands();
      setBrands(freshBrands);
      setForm((f) => ({ ...f, brand: newBrand._id }));
      setBrandModalOpen(false);
    } catch (err) {
      console.error('Failed to save brand', err);
    } finally {
      setSavingBrand(false);
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
            <span className="text-gray-700">Item</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openAddModal}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              + Item Add
            </button>
            <button
              onClick={() => window.print()}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              PDF
            </button>
            <button
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Excel
            </button>
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
              <th className="px-3 py-2 font-medium">CATEGORY</th>
              <th className="px-3 py-2 font-medium">UNIT</th>
              <th className="px-3 py-2 font-medium">BRAND</th>
              <th className="px-3 py-2 font-medium">PURCHASE PRICE</th>
              <th className="px-3 py-2 font-medium">SALE PRICE</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((item, i) => (
              <tr key={item._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{item.code}</td>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.category?.name}</td>
                <td className="px-3 py-2">{item.unit}</td>
                <td className="px-3 py-2">{item.brand?.name || ''}</td>
                <td className="px-3 py-2">{item.purchasePrice || 0}</td>
                <td className="px-3 py-2">{item.salePrice || 0}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded-md"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
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

      <Modal open={modalOpen} title={editingId ? 'Edit Item' : 'New Item'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <div className="flex gap-2">
                <select
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={openBrandModal}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 rounded-md shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input
                required
                placeholder="Item Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                required
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Unit</option>
                {units.map((u) => <option key={u._id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Price</label>
              <input
                type="number"
                placeholder="Enter Purchase Price"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sale Price</label>
              <input
                type="number"
                placeholder="Sale Price"
                value={form.salePrice}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
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

      <Modal open={brandModalOpen} title="Brand" onClose={() => setBrandModalOpen(false)}>
        <form onSubmit={handleBrandSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={brandForm.code}
                onChange={(e) => setBrandForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                required
                placeholder="Name"
                value={brandForm.name}
                onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setBrandModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-md"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={savingBrand}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
            >
              {savingBrand ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}