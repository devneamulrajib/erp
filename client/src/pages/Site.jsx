import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import { Pencil, Trash2 } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'project', label: 'Project' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'location', label: 'Location' },
  { key: 'action', label: 'Action' },
];

const PAGE_SIZE = 10;

const EMPTY_VISIBLE = {
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
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(EMPTY_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCode, setFormCode] = useState('');
  const [formProjectTypeName, setFormProjectTypeName] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setEditingId(row._id);
    setFormCode(row.code);
    setFormProjectTypeName(row.projectTypeName || '');
    setFormProjectId(row.projectId || '');
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
    // Reset project selection since the filtered list will change
    setFormProjectId('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formProjectTypeName) return alert('Please select a Project Type.');
    if (!formProjectId) return alert('Please select a Project.');
    if (!formName.trim()) return;

    const selectedProject = projects.find((p) => p._id === formProjectId);

    const payload = {
      code: formCode,
      projectTypeName: formProjectTypeName,
      projectId: formProjectId,
      projectName: selectedProject ? selectedProject.name : '',
      name: formName,
      description: formDescription,
      location: formLocation,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/sites/${editingId}`, payload);
        setRows((prev) => prev.map((r) => (r._id === editingId ? res.data : r)));
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
    try {
      await api.delete(`/sites/${row._id}`);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete site.');
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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Projects filtered by the currently selected Project Type in the modal
  const filteredProjects = formProjectTypeName
    ? projects.filter((p) => p.projectType === formProjectTypeName)
    : [];

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Project', to: '/dashboard/project' },
            { label: 'Site' },
          ]}
        />
        <button
          onClick={openCreateModal}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Create Site
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>
        )}

        <div className="flex items-center justify-between mb-3">
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
            onSelectAll={() => setVisibleColumns(EMPTY_VISIBLE)}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white">
                {visibleColumns.id && <th className="px-4 py-2 text-left font-medium">ID</th>}
                {visibleColumns.code && <th className="px-4 py-2 text-left font-medium">Code</th>}
                {visibleColumns.project && <th className="px-4 py-2 text-left font-medium">Project</th>}
                {visibleColumns.name && <th className="px-4 py-2 text-left font-medium">Name</th>}
                {visibleColumns.description && <th className="px-4 py-2 text-left font-medium">Description</th>}
                {visibleColumns.location && <th className="px-4 py-2 text-left font-medium">Location</th>}
                {visibleColumns.action && <th className="px-4 py-2 text-left font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row._id} className="border-t border-gray-100">
                    {visibleColumns.id && <td className="px-4 py-2">{row._id}</td>}
                    {visibleColumns.code && <td className="px-4 py-2">{row.code}</td>}
                    {visibleColumns.project && (
                      <td className="px-4 py-2 text-indigo-600 font-medium">{row.projectName}</td>
                    )}
                    {visibleColumns.name && <td className="px-4 py-2">{row.name}</td>}
                    {visibleColumns.description && <td className="px-4 py-2">{row.description}</td>}
                    {visibleColumns.location && <td className="px-4 py-2">{row.location}</td>}
                    {visibleColumns.action && (
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(row)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
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

        <div className="flex justify-end gap-2 mt-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <Modal open={modalOpen} title="Project Add" onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formProjectTypeName}
                onChange={(e) => handleProjectTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              >
                <option value="">Select Project Type</option>
                {projectTypes.map((pt) => (
                  <option key={pt._id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
                disabled={!formProjectTypeName}
              >
                <option value="">Select Project</option>
                {filteredProjects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code</label>
              <input
                value={formCode}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Location</label>
              <input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Location"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}