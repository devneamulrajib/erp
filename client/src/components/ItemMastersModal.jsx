import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Trash2, Plus, Search, Layers, Ruler, Tag } from 'lucide-react';
import Modal from './Modal';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../api/category';
import { getUnits, createUnit, updateUnit } from '../api/unit';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../api/brand';

// One small "Manage" window for the item masters that used to live on the
// separate Category, Unit and Brand pages. Same endpoints, same fields:
// Category: type, code, name (add/edit/delete)
// Unit: code, name, conversion unit, rate (add/edit, no delete, as before)
// Brand: code, name (add/edit/delete)
// Codes are optional on add; the server generates one when it's left blank.
const CATEGORY_TYPES = ['Material', 'Product', 'Service'];

const TABS = {
  category: {
    label: 'Categories', single: 'Category', icon: Layers,
    load: getCategories, create: createCategory, update: updateCategory, remove: deleteCategory,
    empty: { type: '', code: '', name: '' },
    fromRow: (r) => ({ type: r.type || '', code: r.code || '', name: r.name || '' }),
    validate: (v) => (!v.type || !v.name.trim() ? 'Type and Name are required.' : ''),
  },
  unit: {
    label: 'Units', single: 'Unit', icon: Ruler,
    load: getUnits, create: createUnit, update: updateUnit, remove: null,
    empty: { code: '', name: '', conversionUnit: '', rate: '' },
    fromRow: (r) => ({
      code: r.code || '', name: r.name || '', conversionUnit: r.conversionUnit || '', rate: r.rate || '',
    }),
    validate: (v) => (!v.name.trim() ? 'Name is required.' : ''),
  },
  brand: {
    label: 'Brands', single: 'Brand', icon: Tag,
    load: getBrands, create: createBrand, update: updateBrand, remove: deleteBrand,
    empty: { code: '', name: '' },
    fromRow: (r) => ({ code: r.code || '', name: r.name || '' }),
    validate: (v) => (!v.name.trim() ? 'Name is required.' : ''),
  },
};

const INPUT_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function ItemMastersModal({ open, onClose, onChanged, initialTab = 'category' }) {
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // editor: null | { id: null (adding) | id (editing), values }
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cfg = TABS[tab];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await TABS[tab].load());
    } catch (err) {
      console.error(`Failed to load ${tab}`, err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    setEditor(null);
    setError('');
    setSearch('');
    setTypeFilter('');
  }, [tab]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (tab === 'category' && typeFilter && r.type !== typeFilter) return false;
    if (search && !`${r.name || ''} ${r.code || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, search, typeFilter, tab]);

  function setValue(key, value) {
    setEditor((ed) => ({ ...ed, values: { ...ed.values, [key]: value } }));
  }

  async function handleSave(e) {
    e.preventDefault();
    const msg = cfg.validate(editor.values);
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const values = { ...editor.values, name: editor.values.name.trim() };
      if (editor.id) await cfg.update(editor.id, values);
      else await cfg.create(values);
      setEditor(null);
      await load();
      onChanged?.();
    } catch (err) {
      console.error(`Failed to save ${tab}`, err);
      setError(err.response?.data?.message || `Failed to save ${cfg.single.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!cfg.remove) return;
    if (!window.confirm(`Delete "${row.name}"? This can't be undone.`)) return;
    try {
      await cfg.remove(row.id);
      await load();
      onChanged?.();
    } catch (err) {
      console.error(`Failed to delete ${tab}`, err);
      alert(`Could not delete this ${cfg.single.toLowerCase()}. It may be used by items or other records.`);
    }
  }

  const v = editor?.values;

  return (
    <Modal open={open} title="Manage Categories, Units & Brands" onClose={onClose}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {Object.entries(TABS).map(([key, t]) => {
            const Icon = t.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder={`Search ${cfg.label.toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT_CLS} pl-8`}
            />
          </div>
          {tab === 'category' && (
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white">
              <option value="">All types</option>
              {CATEGORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => { setEditor({ id: null, values: { ...cfg.empty } }); setError(''); }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add {cfg.single}
          </button>
        </div>

        {/* Add / edit form */}
        {editor && (
          <form onSubmit={handleSave} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-800">
              {editor.id ? `Edit ${cfg.single}` : `New ${cfg.single}`}
            </div>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tab === 'category' && (
                <Field label="Type" required>
                  <select value={v.type} onChange={(e) => setValue('type', e.target.value)} className={INPUT_CLS}>
                    <option value="">Select type</option>
                    {CATEGORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Name" required>
                <input autoFocus value={v.name} onChange={(e) => setValue('name', e.target.value)} className={INPUT_CLS} placeholder={`${cfg.single} name`} />
              </Field>
              <Field label="Code">
                <input value={v.code} onChange={(e) => setValue('code', e.target.value)} className={`${INPUT_CLS} font-mono`} placeholder="Auto if left blank" />
              </Field>
              {tab === 'unit' && (
                <>
                  <Field label="Conversion Unit">
                    <input value={v.conversionUnit} onChange={(e) => setValue('conversionUnit', e.target.value)} className={INPUT_CLS} placeholder="Conversion Unit" />
                  </Field>
                  <Field label="Rate">
                    <input type="number" value={v.rate} onChange={(e) => setValue('rate', e.target.value)} className={INPUT_CLS} placeholder="Rate" />
                  </Field>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setEditor(null); setError(''); }} className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editor.id ? 'Save Changes' : `Add ${cfg.single}`}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[45vh] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No {cfg.label.toLowerCase()} found.</div>
            ) : filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    {r.code}
                    {tab === 'category' && r.type && <span className="font-sans ml-2 text-slate-500">· {r.type}</span>}
                    {tab === 'unit' && r.conversionUnit && <span className="font-sans ml-2 text-slate-500">· {r.conversionUnit}{Number(r.rate) ? ` × ${r.rate}` : ''}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  title="Edit"
                  onClick={() => { setEditor({ id: r.id, values: cfg.fromRow(r) }); setError(''); }}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                {cfg.remove && (
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => handleDelete(r)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400">{filtered.length} of {rows.length} {cfg.label.toLowerCase()}</div>
      </div>
    </Modal>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
