import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import { Pencil, Trash2, Search, LayoutGrid, Plus, MapPin } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'project', label: 'Project' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'location', label: 'Location' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = {
  id: true,
  code: true,
  project: true,
  name: true,
  description: true,
  location: true,
  action: true,
};

export default function Site() {
  const [rows, setRows] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCode, setFormCode] = useState('');
  const [formProjectTypeName, setFormProjectTypeName] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadRows();
    api.get('/project-types').then((r) => setProjectTypes(r.data)).catch(() => {});
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => {});
  }, []);

  async function loadRows() {
    try {
      const res = await api.get('/sites');
      setRows(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load sites.');
    }
  }

  async function openCreateModal() {
    setEditingId(null);
    setFormProjectTypeName('');
    setFormProjectId('');
    setFormName('');
    setFormDescription('');
    setFormLocation('');
    try {
      const res = await api.get('/sites/next-code');
      setFormCode(res.data.code);
    } catch {
      setFormCode('');
    }
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setFormCode(row.code);
    setFormProjectTypeName(row.projectTypeName || '');
    setFormProjectId(row.projectId ? String(row.projectId) : '');
    setFormName(row.name);
    setFormDescription(row.description || '');
    setFormLocation(row.location || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleProjectTypeChange(value) {
    setFormProjectTypeName(value);
    setFormProjectId('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formProjectTypeName) return alert('Please select a Project Type.');
    if (!formProjectId) return alert('Please select a Project.');
    if (!formName.trim()) return;

    const selectedProject = projects.find((p) => String(p.id) === String(formProjectId));

    const payload = {
      code: formCode,
      projectTypeName: formProjectTypeName,
      projectId: Number(formProjectId),
      projectName: selectedProject ? selectedProject.name : '',
      name: formName,
      description: formDescription,
      location: formLocation,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/sites/${editingId}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editingId ? res.data : r)));
      } else {
        const res = await api.post('/sites', payload);
        setRows((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save site.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete site "${row.name}"?`)) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/sites/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete site.');
    } finally {
      setDeletingId(null);
    }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  }

  const filteredRows = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.projectName || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const filteredProjects = formProjectTypeName
    ? projects.filter((p) => p.projectType === formProjectTypeName)
    : [];

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
                { label: 'Site' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Sites</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage the sites linked to your projects</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Site
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Sites</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pagedRows.length} / {filteredRows.length}</div>
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
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onClearAll={() =>
                  setVisibleColumns({
                    id: false, code: false, project: false, name: false,
                    description: false, location: false, action: false,
                  })
                }
                onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
              />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sites..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {visibleColumns.id && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>}
                  {visibleColumns.code && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>}
                  {visibleColumns.project && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>}
                  {visibleColumns.name && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>}
                  {visibleColumns.description && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>}
                  {visibleColumns.location && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Location</th>}
                  {visibleColumns.action && <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No sites found. Try adjusting your search, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      {visibleColumns.id && <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{row.id}</td>}
                      {visibleColumns.code && (
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                            {row.code}
                          </span>
                        </td>
                      )}
                      {visibleColumns.project && (
                        <td className="px-5 py-3.5 text-indigo-600 font-medium">{row.projectName}</td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openEditModal(row)}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                          >
                            <MapPin size={13} className="text-slate-400" />
                            {row.name}
                          </button>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="px-5 py-3.5 text-slate-600 whitespace-normal max-w-xs">{row.description}</td>
                      )}
                      {visibleColumns.location && (
                        <td className="px-5 py-3.5 text-slate-600">{row.location}</td>
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
                              onClick={() => handleDelete(row)}
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
              Showing <span className="font-medium text-slate-700">{filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filteredRows.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredRows.length}</span> entries
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

      <Modal open={modalOpen} title={editingId ? 'Edit Site' : 'New Site'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formProjectTypeName}
                onChange={(e) => handleProjectTypeChange(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project Type</option>
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                required
                disabled={!formProjectTypeName}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select Project</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
              <input
                value={formCode}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Name"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
              <input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Location"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

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
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Site'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}