import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import ToolbarButton from '../components/ToolbarButton';
import {
  Pencil, Trash2, Copy, FileSpreadsheet, Plus, Search,
  Calendar, MapPin, Wallet, LayoutGrid,
} from 'lucide-react';

const COLUMNS = [
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
};

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Complete: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'On Proposed': 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

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

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function Project() {
  const [rows, setRows] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [options, setOptions] = useState({ statuses: [], areas: [], projectManagers: [] });
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

  useEffect(() => {
    loadOptions();
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
    } catch (err) {
      console.error(err);
    }
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
    setModalOpen(true);
    api.get('/projects/next-code').then((res) => {
      setForm((f) => ({ ...f, code: res.data.code }));
    }).catch(() => {});
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setForm({
      projectType: row.projectType || '', projectManager: row.projectManager || '',
      code: row.code || '', name: row.name || '', description: row.description || '',
      budget: row.budget || '', location: row.location || '', status: row.status || '',
      area: row.area || '', assignUser: row.assignUser || '',
      startDate: row.startDate || '', endDate: row.endDate || '',
    });
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (form.budget !== '' && form.budget !== null && isNaN(Number(form.budget))) {
      alert('Budget must be a valid number (e.g. 1000000). Letters or symbols like "k" are not allowed.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, budget: form.budget === '' ? null : Number(form.budget) };
      if (editingId) {
        const res = await api.put(`/projects/${editingId}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editingId ? res.data : r)));
      } else {
        const res = await api.post('/projects', payload);
        setRows((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      const serverMessage = err?.response?.data?.message;
      alert(serverMessage ? `Failed to save project: ${serverMessage}` : 'Failed to save project. Please check the values you entered (especially Budget) and try again.');
    } finally {
      setSubmitting(false);
    }
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
    } finally {
      setDeletingId(null);
    }
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
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  const activeCount = useMemo(() => rows.filter((r) => r.status === 'Active').length, [rows]);
  const totalBudget = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.budget) || 0), 0),
    [rows]
  );

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
                { label: 'Project', to: '/dashboard/project' },
                { label: 'Project' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage and track every active and past project</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Project
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
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Budget</div>
            <div className="text-xl font-semibold text-slate-900">{formatMoney(totalBudget)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pagedRows.length} / {rows.length}</div>
          </div>
        </div>

        {/* Filters + table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option>All Types</option>
                {projectTypes.map((pt) => (
                  <option key={pt._id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option>All Status</option>
                {options.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Area</label>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Area</option>
                {options.areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
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
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onClearAll={() => setVisibleColumns(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {}))}
                onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
              />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>
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
                    <td colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No projects found. Try adjusting your filters, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{row.id}</td>
                      {visibleColumns.duration && (
                        <td className="px-5 py-3.5 text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            {row.duration}
                          </span>
                        </td>
                      )}
                      {visibleColumns.projectType && (
                        <td className="px-5 py-3.5">
                          {row.projectType ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-600/10">
                              {row.projectType}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      )}
                      {visibleColumns.projectManager && (
                        <td className="px-5 py-3.5">
                          {row.projectManager ? (
                            <span className="inline-flex items-center gap-2 text-slate-700">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(row.projectManager)}`}>
                                {initials(row.projectManager)}
                              </span>
                              {row.projectManager}
                            </span>
                          ) : <span className="text-slate-300 text-xs">Unassigned</span>}
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
                            <Wallet size={13} className="text-slate-400" />
                            {formatMoney(row.budget)}
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
                          {row.location ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={13} className="text-slate-400" />
                              {row.location}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      {visibleColumns.action && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(row)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
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
                  ))
                )}
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

      <Modal open={modalOpen} title={editingId ? 'Edit Project' : 'New Project'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Type</label>
              <select
                value={form.projectType}
                onChange={(e) => updateField('projectType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project Type</option>
                {projectTypes.map((pt) => (
                  <option key={pt._id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Manager</label>
              <select
                value={form.projectManager}
                onChange={(e) => updateField('projectManager', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project Manager</option>
                {options.projectManagers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
              <input
                value={form.code}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Name</label>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Proshanti Residences"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Budget</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
              <input
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Short description"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
              <input
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Location"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Status</option>
                {options.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Area</label>
              <select
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Area</option>
                {options.areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Assign User</label>
              <input
                value={form.assignUser}
                onChange={(e) => updateField('assignUser', e.target.value)}
                placeholder="N/A"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}