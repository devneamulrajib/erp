import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, LayoutGrid, Plus, Tag } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  getServiceItems, getNextServiceItemCode, createServiceItem, updateServiceItem, deleteServiceItem,
} from '../api/serviceItem';
import { getCategories } from '../api/category';
import { getUnits } from '../api/unit';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = { code: '', category: '', name: '', unit: '', cost: '', salePrice: '' };

export default function ServiceWorkNamePage() {
  const [items, setItems] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
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
      const data = await getServiceItems();
      const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
      setItems(list);
    } catch (err) {
      console.error('Failed to load service items', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCategories()
      .then((data) => setCategoryOptions(Array.isArray(data) ? data : (data?.rows || data?.categories || [])))
      .catch(console.error);
    getUnits()
      .then((data) => setUnitOptions(Array.isArray(data) ? data : (data?.rows || data?.units || [])))
      .catch(console.error);
  }, []);

  const filtered = items.filter((it) => {
    if (search && !it.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  async function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    try {
      const result = await getNextServiceItemCode();
      const code = result?.code ?? result?.data?.code ?? '';
      setForm((f) => ({ ...f, code }));
    } catch (err) {
      console.error('Failed to get next code', err);
    }
  }

  function openEditModal(item) {
    setEditingId(item._id || item.id);
    setForm({
      code: item.code || '',
      category: item.category?._id || item.category?.id || item.category || '',
      name: item.name || '',
      unit: item.unit?._id || item.unit?.id || item.unit || '',
      cost: item.cost ?? '',
      salePrice: item.salePrice ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  // When the unit changes, pull that unit's Rate in as a starting point
  // for Cost — only when Cost is still blank, so it never overwrites a
  // value the user (or an existing record) already set.
  function handleUnitChange(unitId) {
    setForm((f) => {
      const selectedUnit = unitOptions.find((u) => String(u._id || u.id) === String(unitId));
      const shouldPrefillCost = selectedUnit?.rate != null && (f.cost === '' || f.cost == null);
      return {
        ...f,
        unit: unitId,
        cost: shouldPrefillCost ? selectedUnit.rate : f.cost,
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateServiceItem(editingId, form);
      } else {
        await createServiceItem(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save service item', err);
      alert(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteServiceItem(item._id || item.id);
      await load();
    } catch (err) {
      console.error('Failed to delete service item', err);
      alert('Failed to delete.');
    }
  }

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
                { label: 'Labour/Worker', to: '/dashboard' },
                { label: 'Service/Work Name' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Service / Work Names</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage service and work names used in labour billing</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Service / Work Name
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Items</div>
            <div className="text-xl font-semibold text-slate-900">{items.length}</div>
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
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service names..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Unit</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Cost</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Sale Price</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No items found. Try adjusting your search, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((item, i) => (
                    <tr key={item._id || item.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                        >
                          <Tag size={13} className="text-slate-400" />
                          {item.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.category?.name ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-medium">
                            {item.category.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{item.unit?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{item.cost ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{item.salePrice ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete"
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
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

      <Modal open={modalOpen} title={editingId ? 'Edit Service / Work Name' : 'Add Service / Work Name'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Service Name *</label>
              <input
                required
                placeholder="Service Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Unit</option>
                {unitOptions.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Cost <span className="text-slate-400 font-normal">(defaults from the unit's rate — editable)</span>
              </label>
              <input
                type="number"
                placeholder="Enter Cost"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Sale Price</label>
              <input
                type="number"
                placeholder="Sale Price"
                value={form.salePrice}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}