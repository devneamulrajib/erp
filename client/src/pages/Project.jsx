import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import ToolbarButton from '../components/ToolbarButton';
import { getProjectManagers, createProjectManager, deleteProjectManager } from '../api/projectManager';
import {
  Pencil, Trash2, Copy, FileSpreadsheet, Plus, Search, X,
  Calendar, MapPin, Wallet, LayoutGrid, Tag, Users, FileText,
  Image as ImageIcon, ImagePlus,
} from 'lucide-react';

const COLUMNS = [
  { key: 'image', label: 'Image' },
  { key: 'duration', label: 'Duration' },
  { key: 'projectType', label: 'Project Type' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'budget', label: 'Budget' },
  { key: 'description', label: 'Description' },
  { key: 'location', label: 'Location' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});

const EMPTY_FORM = {
  projectType: '', projectManager: '', code: '', name: '', description: '',
  budget: '', location: '', status: '', area: '', assignUser: '', startDate: '', endDate: '',
  image: '',
};

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
];

function formatMoney(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('en-US');
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

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

const MAX_IMAGE_MB = 5;

function FormField({ label, required, span, children }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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
  const [projectTypes, setProjectTypes] = useState([]);
  const [options, setOptions] = useState({ statuses: [], areas: [] });
  const [projectManagers, setProjectManagers] = useState([]);
  const [error, setError] = useState(null);

  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterArea, setFilterArea] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [imageError, setImageError] = useState('');

  const [showManagerPanel, setShowManagerPanel] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [savingManager, setSavingManager] = useState(false);

  useEffect(() => {
    loadOptions();
    loadManagers();
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, filterArea, search]);

  async function loadOptions() {
    try {
      const [ptRes, optRes] = await Promise.all([
        api.get('/project-types'),
        api.get('/projects/options'),
      ]);
      setProjectTypes(ptRes.data);
      setOptions(optRes.data);
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
      if (filterType !== 'All Types') params.projectType = filterType;
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

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageError('');
    setShowManagerPanel(false);
    setNewManagerName('');
    setModalOpen(true);
    api.get('/projects/next-code').then((res) => {
      setForm((f) => ({ ...f, code: res.data.code }));
    }).catch(() => {});
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setShowManagerPanel(false);
    setNewManagerName('');
    setImageError('');
    setForm({
      projectType: row.projectType || '', projectManager: row.projectManager || '',
      code: row.code || '', name: row.name || '', description: row.description || '',
      budget: row.budget || '', location: row.location || '', status: row.status || '',
      area: row.area || '', assignUser: row.assignUser || '',
      startDate: row.startDate || '', endDate: row.endDate || '',
      image: row.image || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageError('');
    setShowManagerPanel(false);
    setNewManagerName('');
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
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
    } catch (err) {
      console.error(err);
      alert('Failed to delete project.');
    } finally { setDeletingId(null); }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  }

  function handleCopy() {
    const text = rows.map((r) => `${r.code}\t${r.name}\t${r.projectType}`).join('\n');
    navigator.clipboard.writeText(text).then(() => alert('Table copied to clipboard'));
  }

  function handleCsv() {
    const header = 'Code,Name,Project Type,Project Manager,Budget,Location\n';
    const body = rows.map((r) =>
      [r.code, r.name, r.projectType, r.projectManager, r.budget, r.location].join(',')
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Projects</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Active</div>
            <div className="text-xl font-semibold text-emerald-600">{activeCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Budget</div>
            <div className="text-xl font-semibold text-slate-900">{formatMoney(totalBudget)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pagedRows.length} / {rows.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition">
                <option>All Types</option>
                {projectTypes.map((pt) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
              </select>
            </div>
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
                <option value="">Select Area</option>
                {options.areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Copy} label="Copy" onClick={handleCopy} color="bg-slate-100 hover:bg-slate-200 !text-slate-600" />
              <ToolbarButton icon={FileSpreadsheet} label="CSV" onClick={handleCsv} color="bg-slate-100 hover:bg-slate-200 !text-slate-600" />
              <div className="flex items-center gap-2 ml-2 text-sm text-slate-500">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS} visible={visibleColumns} onToggle={toggleColumn}
                onClearAll={() => setVisibleColumns(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {}))}
                onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
              />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>
                  {visibleColumns.image && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Image</th>}
                  {visibleColumns.duration && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Duration</th>}
                  {visibleColumns.projectType && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Type</th>}
                  {visibleColumns.projectManager && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Manager</th>}
                  {visibleColumns.code && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>}
                  {visibleColumns.name && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>}
                  {visibleColumns.budget && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Budget</th>}
                  {visibleColumns.description && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>}
                  {visibleColumns.location && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Location</th>}
                  {visibleColumns.action && <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No projects found. Try adjusting your filters, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{row.id}</td>
                    {visibleColumns.image && (
                      <td className="px-5 py-3.5">
                        {row.image ? (
                          <img src={row.image} alt={row.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.duration && (
                      <td className="px-5 py-3.5 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />{row.duration}
                        </span>
                      </td>
                    )}
                    {visibleColumns.projectType && (
                      <td className="px-5 py-3.5">
                        {row.projectType
                          ? <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-600/10">{row.projectType}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    )}
                    {visibleColumns.projectManager && (
                      <td className="px-5 py-3.5">
                        {row.projectManager
                          ? <span className="inline-flex items-center gap-2 text-slate-700">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(row.projectManager)}`}>
                                {initials(row.projectManager)}
                              </span>
                              {row.projectManager}
                            </span>
                          : <span className="text-slate-300 text-xs">Unassigned</span>}
                      </td>
                    )}
                    {visibleColumns.code && <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{row.code}</td>}
                    {visibleColumns.name && (
                      <td className="px-5 py-3.5">
                        <button onClick={() => openEditModal(row)} className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2">
                          {row.name}
                        </button>
                      </td>
                    )}
                    {visibleColumns.budget && (
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Wallet size={13} className="text-slate-400" />{formatMoney(row.budget)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.description && (
                      <td className="px-5 py-3.5 text-slate-500 max-w-[220px] truncate" title={row.description}>
                        {row.description || <span className="text-slate-300">—</span>}
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-5 py-3.5 text-slate-500">
                        {row.location
                          ? <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />{row.location}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    )}
                    {visibleColumns.action && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditModal(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50" title="Delete">
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
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

      {/* Modal — self-contained, no dependency on the shared <Modal> component.
          Same pattern as Flat.jsx: fixed overlay with very high z-index (sits above
          the floating topbar), flex-column container capped at 90vh so header and
          footer stay pinned in place and only the middle section scrolls. */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable body */}
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

                <FormSection icon={Tag} title="Classification & Code">
                  <FormField label="Project Type">
                    <select value={form.projectType} onChange={(e) => updateField('projectType', e.target.value)} className={inputClass}>
                      <option value="">Select Project Type</option>
                      {projectTypes.map((pt) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Code">
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
                  <FormField label="Area" span>
                    <select value={form.area} onChange={(e) => updateField('area', e.target.value)} className={inputClass}>
                      <option value="">Select Area</option>
                      {options.areas.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </FormField>
                </FormSection>

                <FormSection icon={Calendar} title="Assignment & Timeline">
                  <FormField label="Assign User" span>
                    <input value={form.assignUser} onChange={(e) => updateField('assignUser', e.target.value)} placeholder="N/A" className={inputClass} />
                  </FormField>
                  <FormField label="Start Date">
                    <input type="date" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="End Date">
                    <input type="date" value={form.endDate} onChange={(e) => updateField('endDate', e.target.value)} className={inputClass} />
                  </FormField>
                </FormSection>
              </div>

              {/* Sticky footer — always visible, never scrolls away */}
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