// src/pages/BudgetCategoryPage.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Folder,
  LayoutGrid,
  Briefcase,
  AlertCircle,
  Wallet,
  Check,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import {
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getAccountDefaults,
  saveAccountDefaults,
} from '../api/budgetCategory';
import { getChartOfAccounts } from '../api/chartOfAccounts';

// Color themes cycling through categories exactly like the design
const CATEGORY_THEMES = [
  { iconBg: 'bg-[#e7f3ee]', iconColor: 'text-[#1d5c48]', borderHover: 'hover:border-[#1d5c48]/30' },
  { iconBg: 'bg-[#f2eefb]', iconColor: 'text-[#6d4ec7]', borderHover: 'hover:border-[#6d4ec7]/30' },
  { iconBg: 'bg-[#fcf0e7]', iconColor: 'text-[#c06b2c]', borderHover: 'hover:border-[#c06b2c]/30' },
  { iconBg: 'bg-[#eaf4ee]', iconColor: 'text-[#2a835b]', borderHover: 'hover:border-[#2a835b]/30' },
  { iconBg: 'bg-[#faebee]', iconColor: 'text-[#b94a5c]', borderHover: 'hover:border-[#b94a5c]/30' },
];

const selectClass =
  'w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123d33]/20 focus:border-[#123d33]';

export default function BudgetCategoryPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  // Payment account defaults (credit side)
  const [defaults, setDefaults] = useState({ cashAccount: '', bankAccount: '', chequeAccount: '' });
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsMsg, setDefaultsMsg] = useState({ type: '', text: '' });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('main'); // 'main' or 'sub'
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [defaultDr, setDefaultDr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgetCategories();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);

      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        const firstTop = list.find((c) => !c.parentId);
        return firstTop ? firstTop.id : null;
      });
    } catch (err) {
      console.error('Failed to load budget categories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getChartOfAccounts()
      .then((res) => {
        const list = res?.data ?? res ?? [];
        setAccounts(
          [...(Array.isArray(list) ? list : [])].sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''))
          )
        );
      })
      .catch(() => {});
    getAccountDefaults().then(setDefaults).catch(() => {});
  }, []);

  const topLevel = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const subsByParent = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      if (c.parentId) {
        map[c.parentId] = map[c.parentId] || [];
        map[c.parentId].push(c);
      }
    });
    return map;
  }, [categories]);

  const filteredTopLevel = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return topLevel;

    return topLevel.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(term);
      const matchDesc = (cat.description || '').toLowerCase().includes(term);
      const matchSubs = (subsByParent[cat.id] || []).some((sub) =>
        sub.name.toLowerCase().includes(term)
      );
      return matchName || matchDesc || matchSubs;
    });
  }, [topLevel, subsByParent, search]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId) || topLevel[0] || null,
    [categories, selectedId, topLevel]
  );

  const activeSubcategories = useMemo(
    () => (selectedCategory ? subsByParent[selectedCategory.id] || [] : []),
    [subsByParent, selectedCategory]
  );

  const totalSubcategories = categories.length - topLevel.length;
  const avgSubsPerCat =
    topLevel.length > 0 ? (totalSubcategories / topLevel.length).toFixed(1) : '0.0';

  const withoutDefault = useMemo(
    () => categories.filter((c) => !c.defaultDrAccount).length,
    [categories]
  );

  // Account dropdown helpers
  const optionsFor = (pattern, current) => {
    const matches = accounts.filter((a) => pattern.test(a.name || ''));
    const list = matches.length > 0 ? matches : accounts;
    const hasCurrent = !current || list.some((a) => a.name === current);
    return { list, extra: hasCurrent ? null : current };
  };

  // Modal Handlers
  function openCreateMainModal() {
    setEditingCategory(null);
    setModalMode('main');
    setName('');
    setDescription('');
    setParentId('');
    setDefaultDr('');
    setError('');
    setShowModal(true);
  }

  function openCreateSubModal(parentCatId) {
    setEditingCategory(null);
    setModalMode('sub');
    setName('');
    setDescription('');
    setParentId(parentCatId || selectedCategory?.id || '');
    setDefaultDr('');
    setError('');
    setShowModal(true);
  }

  function openEditModal(cat) {
    setEditingCategory(cat);
    setModalMode(cat.parentId ? 'sub' : 'main');
    setName(cat.name);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setDefaultDr(cat.defaultDrAccount || '');
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        parentId: parentId || null,
        defaultDrAccount: defaultDr || null,
      };

      if (editingCategory) {
        await updateBudgetCategory(editingCategory.id, payload);
      } else {
        const created = await createBudgetCategory(payload);
        if (!payload.parentId && created?.id) {
          setSelectedId(created.id);
        }
      }

      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat) {
    const subs = subsByParent[cat.id] || [];
    const confirmMsg =
      subs.length > 0
        ? `Delete "${cat.name}"? Its ${subs.length} sub-items will become top-level.`
        : `Are you sure you want to delete "${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteBudgetCategory(cat.id);
      if (selectedId === cat.id) setSelectedId(null);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete category');
    }
  }

  async function handleSaveDefaults() {
    setDefaultsSaving(true);
    setDefaultsMsg({ type: '', text: '' });
    try {
      const saved = await saveAccountDefaults(defaults);
      setDefaults(saved);
      setDefaultsMsg({ type: 'ok', text: 'Default payment accounts saved.' });
    } catch (err) {
      setDefaultsMsg({
        type: 'err',
        text: err.response?.data?.message || 'Failed to save default accounts',
      });
    } finally {
      setDefaultsSaving(false);
    }
  }

  const cashOpts = optionsFor(/cash/i, defaults.cashAccount);
  const bankOpts = optionsFor(/bank/i, defaults.bankAccount);
  const chequeOpts = optionsFor(/bank/i, defaults.chequeAccount);

  return (
    <div className="min-h-screen w-full bg-[#f4f6f4] text-[#132822] flex flex-col font-sans antialiased selection:bg-[#123d33] selection:text-white">
      <Topbar />

      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span
            onClick={() => navigate('/accounts-module/office-budget')}
            className="hover:text-slate-600 cursor-pointer transition"
          >
            Office budget
          </span>
          <span>/</span>
          <span className="text-[#132822] font-bold">Categories</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#20674e]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#20674e]">
                Budget Setup
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#102922] tracking-tight">
              Keep every expense in its place.
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              Organize your budget into clear categories, then add the individual expense items your team uses.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-budget')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm font-semibold text-[#142e26] hover:bg-slate-50 shadow-sm transition-all"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              Back
            </button>

            <button
              type="button"
              onClick={openCreateMainModal}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#123d33] hover:bg-[#0c2c24] text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              New category
            </button>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-[#e7f3ee] text-[#1d5c48] flex items-center justify-center shrink-0">
                <Folder size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Main Categories
                </p>
                <p className="text-2xl font-black text-[#102922] leading-tight">{topLevel.length}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#e9f2eb] text-[#22634d]">
              Active
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-[#f2eefb] text-[#6d4ec7] flex items-center justify-center shrink-0">
                <LayoutGrid size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Expense Items
                </p>
                <p className="text-2xl font-black text-[#102922] leading-tight">{totalSubcategories}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">{avgSubsPerCat} avg.</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-[#e8f1f8] text-[#2c6e9a] flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Currently Viewing
                </p>
                <p className="text-base font-extrabold text-[#102922] truncate">
                  {selectedCategory?.name || 'None selected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Default payment accounts (credit side) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="lg:w-72 shrink-0">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-[#20674e]" />
                <h2 className="text-sm font-extrabold text-[#102922]">Default payment accounts</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Set once. The expense form auto-selects the credit account for each payment channel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Cash</label>
                <select
                  value={defaults.cashAccount}
                  onChange={(e) => setDefaults((d) => ({ ...d, cashAccount: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Not set</option>
                  {cashOpts.extra && <option value={cashOpts.extra}>{cashOpts.extra}</option>}
                  {cashOpts.list.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Transfer</label>
                <select
                  value={defaults.bankAccount}
                  onChange={(e) => setDefaults((d) => ({ ...d, bankAccount: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Not set</option>
                  {bankOpts.extra && <option value={bankOpts.extra}>{bankOpts.extra}</option>}
                  {bankOpts.list.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cheque <span className="font-normal text-slate-400">(uses Bank if empty)</span>
                </label>
                <select
                  value={defaults.chequeAccount}
                  onChange={(e) => setDefaults((d) => ({ ...d, chequeAccount: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Same as Bank</option>
                  {chequeOpts.extra && <option value={chequeOpts.extra}>{chequeOpts.extra}</option>}
                  {chequeOpts.list.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveDefaults}
              disabled={defaultsSaving}
              className="h-10 px-4 rounded-xl bg-[#123d33] hover:bg-[#0c2c24] text-xs font-semibold text-white shadow-xs disabled:opacity-50 shrink-0"
            >
              {defaultsSaving ? 'Saving...' : 'Save defaults'}
            </button>
          </div>

          {defaultsMsg.text && (
            <p
              className={`mt-3 text-xs font-semibold flex items-center gap-1.5 ${
                defaultsMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {defaultsMsg.type === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />}
              {defaultsMsg.text}
            </p>
          )}
        </div>

        {/* 2-Step Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
          {/* STEP 1: Categories Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4.5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#20674e]">Step 1</span>
                <h2 className="text-sm font-extrabold text-[#102922]">Choose a category</h2>
              </div>
              <button
                type="button"
                onClick={openCreateMainModal}
                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
                title="Add category"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-[#f8faf8] text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123d33]/15 focus:border-[#123d33] transition"
              />
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <div className="h-5 w-5 rounded-full border-2 border-[#123d33] border-t-transparent animate-spin mx-auto mb-2" />
                  Loading categories...
                </div>
              ) : filteredTopLevel.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No categories found.</div>
              ) : (
                filteredTopLevel.map((cat, index) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const count = (subsByParent[cat.id] || []).length;
                  const theme = CATEGORY_THEMES[index % CATEGORY_THEMES.length];

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedId(cat.id)}
                      className={`w-full text-left rounded-xl p-3 flex items-center justify-between gap-3 transition-all border ${
                        isSelected
                          ? 'bg-[#edf5f0] border-[#b8ded0] shadow-xs'
                          : `bg-white border-transparent hover:bg-slate-50/80 ${theme.borderHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg} ${theme.iconColor}`}
                        >
                          <Folder size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#112a23] truncate">{cat.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {count} {count === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={15} className={isSelected ? 'text-[#123d33]' : 'text-slate-300'} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 2: Selected Category and Expense Items */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            {selectedCategory ? (
              <>
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-[#e7f3ee] text-[#1d5c48] flex items-center justify-center shrink-0 mt-0.5">
                      <Folder size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#20674e]">
                        Selected Category
                      </span>
                      <h2 className="text-2xl font-black text-[#102922] mt-0.5">{selectedCategory.name}</h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {selectedCategory.description || 'Day-to-day office and workplace operations.'}
                      </p>
                      <div className="mt-2">
                        {selectedCategory.defaultDrAccount ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={11} /> Default debit: {selectedCategory.defaultDrAccount}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(selectedCategory)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          >
                            <AlertCircle size={11} /> No default debit account — set one
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedCategory)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedCategory)}
                      className="h-8 w-8 rounded-lg bg-[#faebee] text-[#cf4755] flex items-center justify-center hover:bg-[#f7dfdf] transition"
                      title="Delete category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#20674e]">Step 2</span>
                    <h3 className="text-sm font-extrabold text-[#102922]">Expense items</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreateSubModal(selectedCategory.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#123d33] hover:bg-[#0c2c24] text-xs font-semibold text-white shadow-xs transition"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    Add item
                  </button>
                </div>

                <div className="divide-y divide-slate-100 min-h-[260px]">
                  {activeSubcategories.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <p className="text-xs font-medium">No expense items yet in "{selectedCategory.name}".</p>
                      <button
                        type="button"
                        onClick={() => openCreateSubModal(selectedCategory.id)}
                        className="mt-3 text-xs font-bold text-[#123d33] hover:underline"
                      >
                        + Add first item
                      </button>
                    </div>
                  ) : (
                    activeSubcategories.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="h-8 w-8 rounded-lg bg-[#f4f6f4] text-slate-500 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#102922] truncate">{sub.name}</p>
                            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                              {sub.description || 'No description provided'}
                            </p>
                            <p className="text-[11px] mt-0.5 truncate">
                              {sub.defaultDrAccount ? (
                                <span className="text-emerald-700 font-semibold">
                                  Debit: {sub.defaultDrAccount}
                                </span>
                              ) : selectedCategory.defaultDrAccount ? (
                                <span className="text-slate-400">
                                  Debit: {selectedCategory.defaultDrAccount} (from category)
                                </span>
                              ) : (
                                <span className="text-amber-600">No default debit account</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(sub)}
                            className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                            title="Edit item"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-6 py-3.5 bg-[#fbfcfa] border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 mt-auto">
                  <span>
                    <strong className="text-[#102922]">{activeSubcategories.length}</strong> items in this
                    category
                    {withoutDefault > 0 && (
                      <span className="ml-3 text-amber-600">
                        {withoutDefault} categor{withoutDefault === 1 ? 'y' : 'ies'} without a default debit
                        account
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateSubModal(selectedCategory.id)}
                    className="text-[#123d33] font-bold hover:underline"
                  >
                    Add another
                  </button>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-slate-400">
                <p className="text-sm font-medium">Please select a category</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#0e221b]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowModal(false)}
          />

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#20674e]">
                  {modalMode === 'sub' ? 'Expense Item' : 'Main Category'}
                </span>
                <h3 className="text-base font-extrabold text-[#102922]">
                  {editingCategory
                    ? `Edit ${modalMode === 'sub' ? 'Item' : 'Category'}`
                    : modalMode === 'sub'
                    ? 'Add Expense Item'
                    : 'New Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={17} />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalMode === 'sub' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Belongs to category</label>
                  <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={selectClass}>
                    {topLevel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={modalMode === 'sub' ? 'e.g. Electricity & water' : 'e.g. Facilities'}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123d33]/20 focus:border-[#123d33]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Utility bills for all locations..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123d33]/20 focus:border-[#123d33] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default debit account{' '}
                  <span className="text-slate-400 font-normal">
                    {modalMode === 'sub' ? '(blank = use the category’s)' : '(auto-selected on expenses)'}
                  </span>
                </label>
                <select value={defaultDr} onChange={(e) => setDefaultDr(e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  {defaultDr && !accounts.some((a) => a.name === defaultDr) && (
                    <option value={defaultDr}>{defaultDr}</option>
                  )}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4.5 py-2 rounded-xl bg-[#123d33] hover:bg-[#0c2c24] text-xs font-semibold text-white shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}