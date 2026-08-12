import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import ToolbarButton from '../components/ToolbarButton';
import { Pencil, Copy, FileSpreadsheet } from 'lucide-react';

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
    setEditingId(row._id);
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
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/projects/${editingId}`, form);
        setRows((prev) => prev.map((r) => (r._id === editingId ? res.data : r)));
      } else {
        const res = await api.post('/projects', form);
        setRows((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save project.');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Project', to: '/dashboard/project' },
            { label: 'Project' },
          ]}
        />
        <button
          onClick={openCreateModal}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Create Project
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>
        )}

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option>All Types</option>
              {projectTypes.map((pt) => (
                <option key={pt._id} value={pt.name}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option>All Status</option>
              {options.statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Area</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Select Area</option>
              {options.areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Copy} label="Copy" onClick={handleCopy} color="bg-blue-400 hover:bg-blue-500" />
            <ToolbarButton icon={FileSpreadsheet} label="CSV" onClick={handleCsv} color="bg-orange-500 hover:bg-orange-600" />
            <span className="text-sm text-gray-500 ml-2">Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">entries</span>
          </div>

          <div className="flex items-center gap-3">
            <SelectColumnsDropdown
              columns={COLUMNS}
              visible={visibleColumns}
              onToggle={toggleColumn}
              onClearAll={() => setVisibleColumns(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {}))}
              onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Search:</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                <th className="px-3 py-2 text-left font-medium">ID</th>
                {visibleColumns.duration && <th className="px-3 py-2 text-left font-medium">Duration</th>}
                {visibleColumns.projectType && <th className="px-3 py-2 text-left font-medium">Project Type</th>}
                {visibleColumns.projectManager && <th className="px-3 py-2 text-left font-medium">Project Manager</th>}
                {visibleColumns.code && <th className="px-3 py-2 text-left font-medium">Code</th>}
                {visibleColumns.name && <th className="px-3 py-2 text-left font-medium">Name</th>}
                {visibleColumns.budget && <th className="px-3 py-2 text-left font-medium">Budget</th>}
                {visibleColumns.description && <th className="px-3 py-2 text-left font-medium">Description</th>}
                {visibleColumns.location && <th className="px-3 py-2 text-left font-medium">Location</th>}
                {visibleColumns.action && <th className="px-3 py-2 text-left font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">No data available in table</td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap">
                    <td className="px-3 py-2">{row._id}</td>
                    {visibleColumns.duration && <td className="px-3 py-2">{row.duration}</td>}
                    {visibleColumns.projectType && <td className="px-3 py-2">{row.projectType}</td>}
                    {visibleColumns.projectManager && <td className="px-3 py-2">{row.projectManager}</td>}
                    {visibleColumns.code && <td className="px-3 py-2">{row.code}</td>}
                    {visibleColumns.name && (
                      <td className="px-3 py-2">
                        <button onClick={() => openEditModal(row)} className="text-indigo-600 hover:underline font-medium">
                          {row.name}
                        </button>
                      </td>
                    )}
                    {visibleColumns.budget && <td className="px-3 py-2">{row.budget}</td>}
                    {visibleColumns.description && <td className="px-3 py-2">{row.description}</td>}
                    {visibleColumns.location && <td className="px-3 py-2">{row.location}</td>}
                    {visibleColumns.action && (
                      <td className="px-3 py-2">
                        <button
                          onClick={() => openEditModal(row)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, rows.length)} of {rows.length} entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-md text-sm ${n === page ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Project Edit' : 'Project Add'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Project Type</label>
              <select
                value={form.projectType}
                onChange={(e) => updateField('projectType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Project Type</option>
                {projectTypes.map((pt) => (
                  <option key={pt._id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Project Manager</label>
              <select
                value={form.projectManager}
                onChange={(e) => updateField('projectManager', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Project Manager</option>
                {options.projectManagers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code</label>
              <input
                value={form.code}
                readOnly
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Project Name</label>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Name"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Description"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Budget</label>
              <input
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="Budget"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Location"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Status</option>
                {options.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Area</label>
              <select
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Area</option>
                {options.areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Assign User</label>
              <input
                value={form.assignUser}
                onChange={(e) => updateField('assignUser', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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