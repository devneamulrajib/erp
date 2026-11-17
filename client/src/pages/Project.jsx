import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import ToolbarButton from '../components/ToolbarButton';
import { getProjectManagers, createProjectManager, deleteProjectManager } from '../api/projectManager';
import { getAreas } from '../api/area';
import {
  Pencil, Trash2, Copy, FileSpreadsheet, Plus, Search, X,
  Calendar, MapPin, Wallet, LayoutGrid, List, Tag, Users, FileText,
  Image as ImageIcon, ImagePlus, Eye, Check, Layers, Clock,
} from 'lucide-react';

const COLUMNS = [
  { key: 'image', label: 'Image' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
  { key: 'location', label: 'Location & Area' },
  { key: 'duration', label: 'Duration' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'budget', label: 'Budget' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});

const EMPTY_FORM = {
  projectManager: '', code: '', name: '', description: '',
  budget: '', location: '', status: 'Active', area: '', assignUser: '', startDate: '', endDate: '',
  image: '',
};

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
];

const STATUS_BADGE = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Complete: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  'On Proposed': 'bg-violet-50 text-violet-700 border-violet-200',
  Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatMoney(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('en-US');
}

function formatDate(v, fallback = 'N/A') {
  if (!v) return fallback;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name) {
  if (!name) return '';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function escapeCsv(val) {
  const s = val === null || val === undefined ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

function StatusBadge({ status }) {
  const label = status || 'Active';
  const cls = STATUS_BADGE[label] || 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

const MAX_IMAGE_MB = 5;

function FormField({ label, required, span, rightAction, children }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="block text-xs font-medium text-slate-500">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {rightAction}
      </div>
      {children}
    </div>
  );
}

function FormSection({ icon: Icon, title, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-indigo-600" />
        </div>
        <h3 className="text-[13px] font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 border border-slate-100 rounded-xl p-4">
        {children}
      </div>
    </div>
  );
}

export default function Project() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ statuses: [], areas: [] });
  const [crmAreas, setCrmAreas] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterArea, setFilterArea] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [copiedToast, setCopiedToast] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [endDateNotFixed, setEndDateNotFixed] = useState(false);
  const [customAreaMode, setCustomAreaMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [imageError, setImageError] = useState('');

  const [viewingProject, setViewingProject] = useState(null);

  const [showManagerPanel, setShowManagerPanel] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [savingManager, setSavingManager] = useState(false);

  useEffect(() => {
    loadOptions();
    loadManagers();
    loadAreas();
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterArea, search]);

  async function loadOptions() {
    try {
      const optRes = await api.get('/projects/options');
      setOptions(optRes.data);
    } catch (err) { console.error(err); }
  }

  async function loadAreas() {
    try {
      const res = await getAreas();
      const raw = Array.isArray(res.data) ? res.data : (res.data?.rows || res.data?.data || []);
      const names = raw
        .map((a) => (typeof a === 'string' ? a : (a.name || a.areaName || a.title || a.area || '')))
        .map((s) => s.trim())
        .filter(Boolean);
      setCrmAreas(names);
    } catch (err) { console.error(err); }
  }

  async function loadManagers() {
    try {
      const data = await getProjectManagers();
      setProjectManagers(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }

  async function loadRows() {
    try {
      const params = {};
      if (filterStatus !== 'All Status') params.status = filterStatus;
      if (filterArea) params.area = filterArea;
      if (search) params.search = search;
      const res = await api.get('/projects', { params });
      setRows(res.data);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError('Failed to load projects.');
    }
  }

  const allAreas = useMemo(() => {
    const set = new Set([
      ...(options.areas || []),
      ...crmAreas,
      ...rows.map((r) => (r.area || '').trim()).filter(Boolean),
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options.areas, crmAreas, rows]);

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEndDateNotFixed(false);
    setCustomAreaMode(allAreas.length === 0);
    setImageError('');
    setShowManagerPanel(false);
    setNewManagerName('');
    setModalOpen(true);
    api.get('/projects/next-code').then((res) => {
      setForm((f) => ({ ...f, code: res.data.code }));
    }).catch(() => {});
  }

  function openEditModal(row) {
    setViewingProject(null);
    setEditingId(row.id);
    setShowManagerPanel(false);
    setNewManagerName('');
    setImageError('');
    const rowEndDate = row.endDate ? String(row.endDate).slice(0, 10) : '';
    const rowArea = row.area || '';
    setEndDateNotFixed(!rowEndDate);
    setCustomAreaMode(Boolean(rowArea) && !allAreas.includes(rowArea));
    setForm({
      projectManager: row.projectManager || '',
      code: row.code || '', name: row.name || '', description: row.description || '',
      budget: row.budget || '', location: row.location || '', status: row.status || 'Active',
      area: rowArea, assignUser: row.assignUser || '',
      startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
      endDate: rowEndDate,
      image: row.image || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEndDateNotFixed(false);
    setCustomAreaMode(false);
    setImageError('');
    setShowManagerPanel(false);
    setNewManagerName('');
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleEndDateNotFixed(checked) {
    setEndDateNotFixed(checked);
    if (checked) {
      updateField('endDate', '');
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`Image must be smaller than ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setImageError('');
    const reader = new FileReader();
    reader.onload = () => updateField('image', reader.result);
    reader.onerror = () => setImageError('Failed to read the image file.');
    reader.readAsDataURL(file);
  }

  function removeImage() {
    updateField('image', '');
    setImageError('');
  }

  async function handleAddManager() {
    if (!newManagerName.trim()) return;
    setSavingManager(true);
    try {
      const created = await createProjectManager({ name: newManagerName.trim() });
      setProjectManagers((prev) => [...prev, created]);
      setNewManagerName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add manager');
    } finally { setSavingManager(false); }
  }

  async function handleDeleteManager(id) {
    if (!window.confirm('Delete this project manager?')) return;
    try {
      await deleteProjectManager(id);
      setProjectManagers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.budget !== '' && form.budget !== null && isNaN(Number(form.budget))) {
      alert('Budget must be a valid number.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        area: (form.area || '').trim(),
        endDate: endDateNotFixed ? '' : (form.endDate || ''),
        budget: form.budget === '' ? null : Number(form.budget),
        image: form.image || null,
      };
      if (editingId) {
        const res = await api.put(`/projects/${editingId}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editingId ? res.data : r)));
      } else {
        const res = await api.post('/projects', payload);
        setRows((prev) => [...prev, res.data]);
      }
      loadOptions();
      closeModal();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to save project.');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/projects/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (viewingProject?.id === id) setViewingProject(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete project.');
    } finally { setDeletingId(null); }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  }

  function handleCopy() {
    const header = 'Code\tName\tStatus\tManager\tBudget\tLocation\tArea\tStart Date\tEnd Date';
    const text = rows
      .map((r) => `${r.code || ''}\t${r.name || ''}\t${r.status || ''}\t${r.projectManager || ''}\t${r.budget || ''}\t${r.location || ''}\t${r.area || ''}\t${r.startDate || ''}\t${r.endDate || 'TBD (Ongoing)'}`)
      .join('\n');
    navigator.clipboard.writeText(`${header}\n${text}`).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    });
  }

  function handleCsv() {
    const header = 'Code,Name,Status,Project Manager,Budget,Location,Area,Start Date,End Date,Description\n';
    const body = rows.map((r) =>
      [
        escapeCsv(r.code),
        escapeCsv(r.name),
        escapeCsv(r.status),
        escapeCsv(r.projectManager),
        escapeCsv(r.budget),
        escapeCsv(r.location),
        escapeCsv(r.area),
        escapeCsv(r.startDate),
        escapeCsv(r.endDate || 'TBD (Ongoing)'),
        escapeCsv(r.description),
      ].join(',')
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'projects.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  const activeCount = useMemo(() => rows.filter((r) => r.status === 'Active').length, [rows]);
  const totalBudget = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.budget) || 0), 0), [rows]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Project', to: '/dashboard/project' },
              { label: 'Project' },
            ]} />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage and track every active and past project</p>
          </div>
          <button onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors">
            <Plus size={16} strokeWidth={2.5} /> Create Project
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Projects</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Active</div>
            <div className="text-xl font-semibold text-emerald-600">{activeCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Budget</div>
            <div className="text-xl font-semibold text-slate-900">{formatMoney(totalBudget)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pagedRows.length} / {rows.length}</div>
          </div>
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition">
                <option>All Status</option>
                {options.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Area</label>
              <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition">
                <option value="">All Areas</option>
                {allAreas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton
                icon={copiedToast ? Check : Copy}
                label={copiedToast ? 'Copied' : 'Copy'}
                onClick={handleCopy}
                color={copiedToast
                  ? 'bg-emerald-50 hover:bg-emerald-100 !text-emerald-700'
                  : 'bg-slate-100 hover:bg-slate-200 !text-slate-600'}
              />
              <ToolbarButton icon={FileSpreadsheet} label="CSV" onClick={handleCsv} color="bg-slate-100 hover:bg-slate-200 !text-slate-600" />
              <div className="flex items-center gap-2 ml-1 text-sm text-slate-500">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="hidden sm:inline">entries</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <div className="hidden md:inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Table view"
                >
                  <List size={14} /> Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Card grid view"
                >
                  <LayoutGrid size={14} /> Cards
                </button>
              </div>

              {viewMode === 'table' && (
                <div className="hidden md:block">
                  <SelectColumnsDropdown
                    columns={COLUMNS} visible={visibleColumns} onToggle={toggleColumn}
                    onClearAll={() => setVisibleColumns(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {}))}
                    onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
                  />
                </div>
              )}

              <div className="relative flex-1 sm:flex-initial">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-full sm:w-60 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
              </div>
            </div>
          </div>

          {/* Empty state */}
          {pagedRows.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <LayoutGrid size={28} strokeWidth={1.5} />
                <p className="text-sm">No projects found. Try adjusting your filters, or create one.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View — zero horizontal scrolling */}
              {viewMode === 'table' && (
                <div className="hidden md:block w-full">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <th className="w-[34%] px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">
                          Project
                        </th>
                        {visibleColumns.location && (
                          <th className="w-[15%] px-3 py-3 text-left font-medium text-xs uppercase tracking-wide">
                            Location
                          </th>
                        )}
                        {visibleColumns.duration && (
                          <th className="w-[16%] px-3 py-3 text-left font-medium text-xs uppercase tracking-wide">
                            Timeline
                          </th>
                        )}
                        {visibleColumns.projectManager && (
                          <th className="w-[13%] px-3 py-3 text-left font-medium text-xs uppercase tracking-wide">
                            Manager
                          </th>
                        )}
                        {visibleColumns.budget && (
                          <th className="w-[12%] px-3 py-3 text-left font-medium text-xs uppercase tracking-wide">
                            Budget
                          </th>
                        )}
                        {visibleColumns.action && (
                          <th className="w-[10%] px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors align-top">
                          <td className="px-4 py-3.5">
                            <div className="flex items-start gap-3 min-w-0">
                              {visibleColumns.image && (
                                <button
                                  type="button"
                                  onClick={() => setViewingProject(row)}
                                  className="shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 w-11 h-11 flex items-center justify-center"
                                  title="View project details"
                                >
                                  {row.image ? (
                                    <img src={row.image} alt={row.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon size={17} className="text-slate-300" />
                                  )}
                                </button>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setViewingProject(row)}
                                    className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm hover:underline underline-offset-2 truncate max-w-full text-left"
                                    title={row.name}
                                  >
                                    {row.name}
                                  </button>
                                  {visibleColumns.status && <StatusBadge status={row.status} />}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                                  <span>#{row.id}</span>
                                  {row.code && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-500">{row.code}</span>
                                    </>
                                  )}
                                </div>
                                {visibleColumns.description && row.description && (
                                  <p
                                    className="text-xs text-slate-500 mt-1 line-clamp-2 break-words"
                                    title={row.description}
                                  >
                                    {row.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {visibleColumns.location && (
                            <td className="px-3 py-3.5 text-slate-600">
                              {row.location || row.area ? (
                                <div className="space-y-1">
                                  {row.location && (
                                    <div className="flex items-start gap-1.5 text-xs font-medium text-slate-700">
                                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                      <span className="break-words">{row.location}</span>
                                    </div>
                                  )}
                                  {row.area && (
                                    <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      <Layers size={11} className="text-slate-400" />
                                      <span className="truncate max-w-[120px]">{row.area}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          )}

                          {visibleColumns.duration && (
                            <td className="px-3 py-3.5 text-xs text-slate-600">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-400 shrink-0" />
                                  <span className="text-slate-400">From:</span>
                                  <span className="font-medium text-slate-700">{formatDate(row.startDate)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pl-[18px]">
                                  <span className="text-slate-400">To:</span>
                                  {row.endDate ? (
                                    <span className="font-medium text-slate-700">{formatDate(row.endDate)}</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                      <Clock size={10} /> TBD
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}

                          {visibleColumns.projectManager && (
                            <td className="px-3 py-3.5">
                              {row.projectManager ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold ${avatarColor(row.projectManager)}`}>
                                      {initials(row.projectManager)}
                                    </span>
                                    <span className="text-xs font-medium text-slate-700 truncate" title={row.projectManager}>
                                      {row.projectManager}
                                    </span>
                                  </div>
                                  {row.assignUser && row.assignUser !== 'N/A' && (
                                    <div className="text-[11px] text-slate-400 pl-8 truncate" title={`Assigned: ${row.assignUser}`}>
                                      {row.assignUser}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">Unassigned</span>
                              )}
                            </td>
                          )}

                          {visibleColumns.budget && (
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                                <Wallet size={13} className="text-slate-400 shrink-0" />
                                <span>{formatMoney(row.budget)}</span>
                              </div>
                              {Number(row.totalTask) > 0 && (
                                <div className="text-[11px] text-slate-400 mt-1">
                                  Tasks: {row.completeTask || 0}/{row.totalTask}
                                </div>
                              )}
                            </td>
                          )}

                          {visibleColumns.action && (
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingProject(row)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(row)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row.id)}
                                  disabled={deletingId === row.id}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card Grid View */}
              <div className={`${viewMode === 'grid' ? 'block' : 'block md:hidden'} p-4 sm:p-5 bg-slate-50/40`}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pagedRows.map((row) => (
                    <div
                      key={row.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                    >
                      <div className="relative h-36 bg-slate-100 border-b border-slate-100">
                        {row.image ? (
                          <img src={row.image} alt={row.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                            <ImageIcon size={26} />
                            <span className="text-[11px]">No project image</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-[11px] font-mono font-medium text-slate-700 shadow-xs">
                            #{row.id} {row.code ? `· ${row.code}` : ''}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <StatusBadge status={row.status} />
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingProject(row)}
                            className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left leading-snug"
                          >
                            {row.name}
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 min-h-[2rem]">
                          {row.description || 'No description provided.'}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 mt-auto">
                          <div>
                            <div className="text-[11px] text-slate-400 mb-0.5">Budget</div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <Wallet size={12} className="text-slate-400" />
                              {formatMoney(row.budget)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-400 mb-0.5">Location</div>
                            <div className="font-medium text-slate-700 flex items-center gap-1 truncate">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{row.location || row.area || '—'}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-400 mb-0.5">Manager</div>
                            {row.projectManager ? (
                              <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                                <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-semibold ${avatarColor(row.projectManager)}`}>
                                  {initials(row.projectManager)}
                                </span>
                                <span className="truncate">{row.projectManager}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Unassigned</span>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-400 mb-0.5">Timeline</div>
                            <div className="text-slate-600 flex items-center gap-1 truncate">
                              <Calendar size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">
                                {formatDate(row.startDate)} → {row.endDate ? formatDate(row.endDate) : 'TBD'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setViewingProject(row)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> View Details
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 hover:border-red-300 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{rows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, rows.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{rows.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {n}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick-View Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9998] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="relative h-48 bg-slate-100 shrink-0">
              {viewingProject.image ? (
                <img src={viewingProject.image} alt={viewingProject.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={36} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setViewingProject(null)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white text-slate-600 shadow-sm transition-colors"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white/95 text-xs font-mono font-medium text-slate-700 shadow-xs">
                  #{viewingProject.id} {viewingProject.code ? `· ${viewingProject.code}` : ''}
                </span>
                <StatusBadge status={viewingProject.status} />
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{viewingProject.name}</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {viewingProject.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Budget</div>
                  <div className="font-semibold text-slate-900">{formatMoney(viewingProject.budget)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Project Manager</div>
                  <div className="font-medium text-slate-800">{viewingProject.projectManager || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Assigned User</div>
                  <div className="font-medium text-slate-800">{viewingProject.assignUser || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Location</div>
                  <div className="font-medium text-slate-800">{viewingProject.location || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Area</div>
                  <div className="font-medium text-slate-800">{viewingProject.area || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Timeline</div>
                  <div className="font-medium text-slate-800 text-xs">
                    {formatDate(viewingProject.startDate)} →{' '}
                    {viewingProject.endDate ? formatDate(viewingProject.endDate) : 'TBD (Ongoing)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => handleDelete(viewingProject.id)}
                disabled={deletingId === viewingProject.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(viewingProject)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-colors"
                >
                  <Pencil size={14} /> Edit Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto">

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={13} className="text-indigo-600" />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-700">Project Image</h3>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                    {form.image ? (
                      <div className="relative w-full h-44 rounded-lg overflow-hidden group">
                        <img src={form.image} alt="Project" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button type="button" onClick={removeImage}
                          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white text-slate-500 hover:text-red-600 shadow-sm transition-colors">
                          <Trash2 size={14} />
                        </button>
                        <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-medium text-slate-600 shadow-sm cursor-pointer transition-colors">
                          <ImagePlus size={13} /> Replace
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 w-full h-44 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-white cursor-pointer transition-colors">
                        <ImagePlus size={22} className="text-slate-400" />
                        <span className="text-xs text-slate-500">Click to upload a project image</span>
                        <span className="text-[11px] text-slate-400">PNG or JPG, up to {MAX_IMAGE_MB}MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                    {imageError && <p className="text-xs text-red-500 mt-2">{imageError}</p>}
                  </div>
                </div>

                <FormSection icon={Tag} title="Project Code">
                  <FormField label="Code" span>
                    <input value={form.code} readOnly className={`${inputClass} bg-slate-50 text-slate-500 font-mono`} />
                  </FormField>
                </FormSection>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                        <Users size={13} className="text-indigo-600" />
                      </div>
                      <h3 className="text-[13px] font-semibold text-slate-700">Project Manager</h3>
                    </div>
                    <button type="button"
                      onClick={() => { setShowManagerPanel((s) => !s); setNewManagerName(''); }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline">
                      {showManagerPanel ? 'Done' : 'Manage'}
                    </button>
                  </div>

                  {showManagerPanel ? (
                    <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                      <div className="flex gap-2">
                        <input
                          value={newManagerName}
                          onChange={(e) => setNewManagerName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManager(); } }}
                          placeholder="Manager name"
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <button type="button" onClick={handleAddManager} disabled={savingManager}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                          {savingManager ? '...' : 'Add'}
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {projectManagers.length === 0
                          ? <p className="text-xs text-slate-400 text-center py-2">No managers yet — add one above</p>
                          : projectManagers.map((m) => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-100">
                              <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(m.name)}`}>
                                  {initials(m.name)}
                                </span>
                                {m.name}
                              </span>
                              <button type="button" onClick={() => handleDeleteManager(m.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <select value={form.projectManager} onChange={(e) => updateField('projectManager', e.target.value)} className={inputClass}>
                      <option value="">Select Project Manager</option>
                      {projectManagers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  )}
                </div>

                <FormSection icon={FileText} title="Naming, Budget & Description">
                  <FormField label="Project Name" required span>
                    <input value={form.name} onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g. Proshanti Residences" required className={inputClass} />
                  </FormField>
                  <FormField label="Budget">
                    <input type="number" min="0" step="any" value={form.budget}
                      onChange={(e) => updateField('budget', e.target.value)} placeholder="0" className={inputClass} />
                  </FormField>
                  <FormField label="Description" span>
                    <input value={form.description} onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Short description" className={inputClass} />
                  </FormField>
                </FormSection>

                <FormSection icon={MapPin} title="Location & Status">
                  <FormField label="Location">
                    <input value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Location" className={inputClass} />
                  </FormField>
                  <FormField label="Status">
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className={inputClass}>
                      <option value="">Select Status</option>
                      {options.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField
                    label="Area"
                    span
                    rightAction={
                      allAreas.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAreaMode((m) => !m);
                            updateField('area', '');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          {customAreaMode ? 'Choose from list' : '+ Type custom area'}
                        </button>
                      )
                    }
                  >
                    {customAreaMode || allAreas.length === 0 ? (
                      <input
                        value={form.area}
                        onChange={(e) => updateField('area', e.target.value)}
                        placeholder="Enter area (e.g. Bashundhara R/A)"
                        className={inputClass}
                      />
                    ) : (
                      <select value={form.area} onChange={(e) => updateField('area', e.target.value)} className={inputClass}>
                        <option value="">Select Area</option>
                        {allAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    )}
                  </FormField>
                </FormSection>

                <FormSection icon={Calendar} title="Assignment & Timeline">
                  <FormField label="Assign User" span>
                    <input value={form.assignUser} onChange={(e) => updateField('assignUser', e.target.value)} placeholder="N/A" className={inputClass} />
                  </FormField>
                  <FormField label="Start Date">
                    <input type="date" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField
                    label="End Date"
                    rightAction={
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={endDateNotFixed}
                          onChange={(e) => toggleEndDateNotFixed(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 accent-indigo-600"
                        />
                        <span>Not fixed yet (set later)</span>
                      </label>
                    }
                  >
                    {endDateNotFixed ? (
                      <div className="w-full border border-dashed border-amber-300 bg-amber-50/70 rounded-lg px-3 py-2.5 text-sm text-amber-800 flex items-center gap-2">
                        <Clock size={15} className="text-amber-600 shrink-0" />
                        <span>Ongoing — end date will be declared later</span>
                      </div>
                    ) : (
                      <input
                        type="date"
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={(e) => updateField('endDate', e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </FormField>
                </FormSection>
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-white rounded-b-2xl">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}