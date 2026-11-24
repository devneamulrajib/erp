import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Pencil, Trash2, Plus, Package, FileText, FileSpreadsheet,
  Search, ChevronLeft, ChevronRight, Boxes, Wallet, Tag, List, Settings2,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import ItemMastersModal from '../components/ItemMastersModal';
import { getItems, createItem, updateItem, deleteItem } from '../api/item';
import { getCategories, createCategory } from '../api/category';
import { getBrands, createBrand } from '../api/brand';
import { getUnits, createUnit } from '../api/unit';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = {
  category: '', brand: '', name: '', unit: '', purchasePrice: '', salePrice: '',
};
const CATEGORY_TYPES = ['Material', 'Product', 'Service'];
// Category, Unit and Brand can each be picked from the list or typed in as
// new right inside the item form, so adding a product is one form / one save
// instead of visiting the Category, Brand and Unit pages first.
const EMPTY_NEW_MODE = { category: false, unit: false, brand: false };
const EMPTY_NEW_ENTRY = { category: '', categoryType: 'Material', unit: '', brand: '' };
const INPUT_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

// Deterministic accent color per category name, so the same category always
// reads the same way across the table without needing a color field in the data.
const CATEGORY_PALETTE = [
  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
];
function categoryStyle(name) {
  if (!name) return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

function money(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

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
  const [formError, setFormError] = useState('');

  const [newMode, setNewMode] = useState(EMPTY_NEW_MODE);
  const [newEntry, setNewEntry] = useState(EMPTY_NEW_ENTRY);
  // Category / Unit / Brand management (replaces the old separate pages)
  const [mastersOpen, setMastersOpen] = useState(false);
  const [mastersTab, setMastersTab] = useState('category');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // getItems/getCategories/getBrands/getUnits already resolve to the
      // unwrapped data (see api/item.js, api/category.js, etc. — each one
      // does `return res.data` internally), so no extra `.data` here.
      const [itemsData, categoriesData, brandsData, unitsData] = await Promise.all([
        getItems(), getCategories(), getBrands(), getUnits(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
      setBrands(brandsData);
      setUnits(unitsData);
    } catch (err) {
      console.error('Failed to load item data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter((it) => {
    if (search && !it.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const avgMargin = useMemo(() => {
    const withPrices = items.filter((it) => Number(it.salePrice) > 0);
    if (!withPrices.length) return 0;
    const total = withPrices.reduce((sum, it) => {
      const purchase = Number(it.purchasePrice) || 0;
      const sale = Number(it.salePrice) || 0;
      return sum + ((sale - purchase) / sale) * 100;
    }, 0);
    return total / withPrices.length;
  }, [items]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNewMode(EMPTY_NEW_MODE);
    setNewEntry(EMPTY_NEW_ENTRY);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setForm({
      category: item.category?.id ?? item.categoryId ?? '',
      brand: item.brand?.id ?? item.brandId ?? '',
      name: item.name,
      unit: item.unit,
      purchasePrice: item.purchasePrice || '',
      salePrice: item.salePrice || '',
    });
    setNewMode(EMPTY_NEW_MODE);
    setNewEntry(EMPTY_NEW_ENTRY);
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function toggleNew(key) {
    setNewMode((m) => ({ ...m, [key]: !m[key] }));
    setFormError('');
  }

  function findByName(list, name) {
    const wanted = name.trim().toLowerCase();
    return list.find((x) => (x.name || '').trim().toLowerCase() === wanted);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newCategoryName = newEntry.category.trim();
    const newUnitName = newEntry.unit.trim();
    const newBrandName = newEntry.brand.trim();
    const hasCategory = newMode.category ? !!newCategoryName : !!form.category;
    const hasUnit = newMode.unit ? !!newUnitName : !!form.unit;
    if (!hasCategory || !form.name || !hasUnit) {
      setFormError('Category, Item Name and Unit are required.');
      return;
    }
    if (newMode.brand && !newBrandName) {
      setFormError('Type the new brand name, or click "Pick existing".');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };

      // Create any new category / unit / brand first (re-using an existing one
      // with the same name), then save the item, all from this one Save click.
      // Each one is locked into the form as soon as it exists, so a retry after
      // an error never creates a duplicate.
      if (newMode.category) {
        const cat = findByName(categories, newCategoryName)
          || await createCategory({ type: newEntry.categoryType, name: newCategoryName });
        if (!categories.some((c) => c.id === cat.id)) setCategories((list) => [cat, ...list]);
        payload.category = cat.id;
        setForm((f) => ({ ...f, category: cat.id }));
        setNewMode((m) => ({ ...m, category: false }));
      }
      if (newMode.unit) {
        const unit = findByName(units, newUnitName) || await createUnit({ name: newUnitName });
        if (!units.some((u) => u.id === unit.id)) setUnits((list) => [unit, ...list]);
        payload.unit = unit.name;
        setForm((f) => ({ ...f, unit: unit.name }));
        setNewMode((m) => ({ ...m, unit: false }));
      }
      if (newMode.brand) {
        const brand = findByName(brands, newBrandName) || await createBrand({ name: newBrandName });
        if (!brands.some((b) => b.id === brand.id)) setBrands((list) => [brand, ...list]);
        payload.brand = brand.id;
        setForm((f) => ({ ...f, brand: brand.id }));
        setNewMode((m) => ({ ...m, brand: false }));
      }

      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save item', err);
      setFormError(err.response?.data?.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    try {
      await deleteItem(item.id);
      await load();
    } catch (err) {
      console.error('Failed to delete item', err);
      alert('Could not delete this item. It may be used elsewhere.');
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
                { label: 'Inventory', to: '/dashboard/inventory' },
                { label: 'Item' },
              ]}
            />
            <div className="flex items-center gap-3 mt-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
                <Boxes size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Item Catalog</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-12">Every item you stock, priced and organized in one place</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Item
            </button>
            <button
              onClick={() => { setMastersTab('category'); setMastersOpen(true); }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              title="Add, edit or delete categories, units and brands"
            >
              <Settings2 size={15} />
              Categories, Units &amp; Brands
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <FileText size={15} />
              PDF
            </button>
            <button
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <FileSpreadsheet size={15} />
              Excel
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Total Items" value={items.length} accent="bg-indigo-500" />
          <SummaryCard label="Categories" value={categories.length} accent="bg-violet-500" />
          <SummaryCard label="Brands" value={brands.length} accent="bg-sky-500" />
          <SummaryCard
            label="Avg. Margin"
            value={items.length ? `${avgMargin.toFixed(1)}%` : '—'}
            accent="bg-emerald-500"
          />
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
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
                placeholder="Search by item name..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-72 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 whitespace-nowrap border-b border-slate-100">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Item</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Unit</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Brand</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Purchase</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Sale</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Margin</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Loading items…</td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Package size={28} strokeWidth={1.5} />
                        {search ? (
                          <p className="text-sm">No items match "{search}". Try a different search.</p>
                        ) : (
                          <p className="text-sm">No items yet. Add your first one to start building the catalog.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((item) => {
                    const catName = item.Category?.name;
                    const style = categoryStyle(catName);
                    const purchase = Number(item.purchasePrice) || 0;
                    const sale = Number(item.salePrice) || 0;
                    const margin = sale > 0 ? ((sale - purchase) / sale) * 100 : null;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap group">
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="flex items-center gap-3 text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors shrink-0">
                              <Package size={15} />
                            </div>
                            <div>
                              <div className="text-slate-800 font-medium group-hover:text-indigo-600 transition-colors">{item.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          {catName ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {catName}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{item.unit}</td>
                        <td className="px-5 py-3.5 text-slate-600">{item.Brand?.name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-3.5 text-right text-slate-600 tabular-nums">{money(purchase)}</td>
                        <td className="px-5 py-3.5 text-right text-slate-900 font-medium tabular-nums">{money(sale)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {margin === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className={margin >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                              {margin >= 0 ? '+' : ''}{margin.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    );
                  })
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
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                <ChevronLeft size={15} />
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
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Item' : 'Add Item'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <p className="text-xs text-slate-500 -mt-1">
            Fill everything on this one form. Category, Unit or Brand not in the list yet?
            Click <span className="font-medium text-indigo-600">+ New</span> and type it here, it is saved together with the item.
          </p>

          {/* 1. Item details */}
          <FormSection icon={Package} title="Item details">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Item Name<span className="text-red-500 ml-0.5">*</span></label>
              <input
                required
                autoFocus
                placeholder="e.g. Portland Cement"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <PickOrCreateField
              label="Category"
              required
              creating={newMode.category}
              onToggle={() => toggleNew('category')}
              select={(
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={INPUT_CLS}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              create={(
                <div className="flex gap-2">
                  <input
                    placeholder="New category name"
                    value={newEntry.category}
                    onChange={(e) => setNewEntry((n) => ({ ...n, category: e.target.value }))}
                    className={INPUT_CLS}
                  />
                  <select
                    value={newEntry.categoryType}
                    onChange={(e) => setNewEntry((n) => ({ ...n, categoryType: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition shrink-0"
                    title="Category type"
                  >
                    {CATEGORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            />
            <PickOrCreateField
              label="Unit"
              required
              creating={newMode.unit}
              onToggle={() => toggleNew('unit')}
              select={(
                <select
                  required
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className={INPUT_CLS}
                >
                  <option value="">Select unit</option>
                  {units.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
              create={(
                <input
                  placeholder="New unit, e.g. Bag, Kg, Pcs"
                  value={newEntry.unit}
                  onChange={(e) => setNewEntry((n) => ({ ...n, unit: e.target.value }))}
                  className={INPUT_CLS}
                />
              )}
            />
          </FormSection>

          {/* 2. Pricing */}
          <FormSection icon={Wallet} title="Pricing" hint="Optional, you can fill it later">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Purchase Price</label>
              <input
                type="number"
                placeholder="0"
                value={form.purchasePrice}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Sale Price</label>
              <input
                type="number"
                placeholder="0"
                value={form.salePrice}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            {Number(form.salePrice) > 0 && (
              <div className="sm:col-span-2 text-xs text-slate-500">
                Profit per unit:{' '}
                <span className={`font-semibold ${Number(form.salePrice) - (Number(form.purchasePrice) || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {money(Number(form.salePrice) - (Number(form.purchasePrice) || 0))}
                  {' '}({(((Number(form.salePrice) - (Number(form.purchasePrice) || 0)) / Number(form.salePrice)) * 100).toFixed(1)}% margin)
                </span>
              </div>
            )}
          </FormSection>

          {/* 3. Brand (optional) */}
          <FormSection icon={Tag} title="Brand" hint="Optional">
            <div className="sm:col-span-2">
              <PickOrCreateField
                label="Brand"
                creating={newMode.brand}
                onToggle={() => toggleNew('brand')}
                select={(
                  <select
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    <option value="">No brand</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                create={(
                  <input
                    placeholder="New brand name"
                    value={newEntry.brand}
                    onChange={(e) => setNewEntry((n) => ({ ...n, brand: e.target.value }))}
                    className={INPUT_CLS}
                  />
                )}
              />
            </div>
          </FormSection>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      <ItemMastersModal
        open={mastersOpen}
        initialTab={mastersTab}
        onClose={() => setMastersOpen(false)}
        onChanged={load}
      />
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1 pl-2">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 pl-2 tabular-nums">{value}</div>
    </div>
  );
}
function FormSection({ icon: Icon, title, hint, children }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon size={15} className="text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function PickOrCreateField({ label, required, creating, onToggle, select, create }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-slate-500">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {creating && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">new</span>}
        </label>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {creating ? <><List size={12} /> Pick existing</> : <><Plus size={12} /> New</>}
        </button>
      </div>
      {creating ? create : select}
    </div>
  );
}
