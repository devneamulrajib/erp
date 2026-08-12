import { useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

// TODO: replace with your real api client, e.g. import api from '../api/axios';

const SHARE_TYPE_OPTIONS = [
  { value: 'construction-share', label: 'Construction Share' },
  { value: 'land-share', label: 'Land Share' },
];

const ASSIGN_TYPE_OPTIONS = [
  { value: 'fixed-amount', label: 'Fixed-Amount' },
  { value: 'percentage', label: 'Percentage' },
];

const emptyForm = {
  title: '',
  project: '',
  shareType: '',
  taskNames: '',
  assignType: '',
  configurationAmount: '',
  status: 'active',
};

export default function ProjectShareConfiguration() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [projectOptions, setProjectOptions] = useState([]);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // const { data } = await api.get('/project-module/share-configuration');
        // if (!cancelled) setRows(data);

        // Mock data matching current screenshot until API is wired up:
        const mock = [
          { id: 1, title: '1st Installment', project: 'Abason Project', shareType: 'Construction Share', taskNames: 'N/A', assignType: 'N/A', amount: 100000, status: 'inactive' },
          { id: 2, title: 'test', project: 'N/A', shareType: 'Land Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 1111, status: 'active' },
          { id: 3, title: '1st Installment', project: 'N/A', shareType: 'Construction Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 100000, status: 'active' },
          { id: 4, title: 'instalment', project: 'N/A', shareType: 'Land Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 5000000, status: 'active' },
          { id: 5, title: '', project: 'N/A', shareType: 'Construction Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 10000000, status: 'active' },
          { id: 6, title: '1st Follr Rooftoop', project: 'N/A', shareType: 'Construction Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 3000000, status: 'active' },
          { id: 7, title: '1st installment Title Share Project', project: 'N/A', shareType: 'Construction Share', taskNames: 'N/A', assignType: 'Fixed-Amount', amount: 70000, status: 'active' },
        ];
        if (!cancelled) setRows(mock);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // TODO: api.get('/project-module/projects').then(({ data }) =>
    //   setProjectOptions(data.map((p) => ({ value: p._id, label: p.name })))
    // );
    setProjectOptions([]);
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) =>
      Object.values(r).join(' ').toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setForm({
      title: row.title || '',
      project: row.project || '',
      shareType: row.shareType || '',
      taskNames: row.taskNames || '',
      assignType: row.assignType || '',
      configurationAmount: row.amount || '',
      status: row.status || 'active',
    });
    setEditingId(row.id);
    setIsModalOpen(true);
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (editingId) {
      // TODO: await api.put(`/project-module/share-configuration/${editingId}`, form);
      console.log('Updating configuration:', editingId, form);
    } else {
      // TODO: await api.post('/project-module/share-configuration', form);
      console.log('Creating configuration:', form);
    }
    setIsModalOpen(false);
  }

  function handleDelete(row) {
    // TODO: confirm + await api.delete(`/project-module/share-configuration/${row.id}`)
    console.log('Delete row:', row);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Share Configuration Settings', to: '/project-module/share-project/configuration' },
          ]}
        />
      </div>

      <div className="px-4 pb-6">
        {/* Add Configuration button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={15} />
            Add Configuration
          </button>
        </div>

        {/* Entries + Search row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Search:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-3 font-medium">SL NO</th>
                <th className="px-4 py-3 font-medium">TITLE/NAME</th>
                <th className="px-4 py-3 font-medium">PROJECT NAME</th>
                <th className="px-4 py-3 font-medium">SHARE TYPE</th>
                <th className="px-4 py-3 font-medium">TASK NAMES</th>
                <th className="px-4 py-3 font-medium">ASSIGN TYPE</th>
                <th className="px-4 py-3 font-medium">CONFIGURATION AMOUNT</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                <th className="px-4 py-3 font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3">
                      {row.project !== 'N/A' ? (
                        <span className="text-indigo-600 hover:underline cursor-pointer">
                          {row.project}
                        </span>
                      ) : (
                        row.project
                      )}
                    </td>
                    <td className="px-4 py-3">{row.shareType}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-200 text-gray-600 text-xs font-medium px-2 py-1 rounded">
                        {row.taskNames}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.assignType}</td>
                    <td className="px-4 py-3">{row.amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-3 py-1 rounded ${
                          row.status === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-400 text-white'
                        }`}
                      >
                        {row.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white p-1.5 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="bg-red-400 hover:bg-red-500 text-white p-1.5 rounded-md transition-colors"
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

        {/* Pagination footer */}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 rounded-md bg-indigo-500 text-white">
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Configuration modal */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Edit Configuration' : 'Add Configuration'}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-700 mb-1">
              Title/Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Project Name</label>
            <SearchableSelect
              options={projectOptions}
              value={form.project}
              onChange={(v) => handleChange('project', v)}
              placeholder="Select Project"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Share Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={SHARE_TYPE_OPTIONS}
              value={form.shareType}
              onChange={(v) => handleChange('shareType', v)}
              placeholder="Select Share Type"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Task Names</label>
            <input
              type="text"
              value={form.taskNames}
              onChange={(e) => handleChange('taskNames', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Assign Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={ASSIGN_TYPE_OPTIONS}
              value={form.assignType}
              onChange={(v) => handleChange('assignType', v)}
              placeholder="Select Assign Type"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Configuration Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.configurationAmount}
              onChange={(e) => handleChange('configurationAmount', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>
    </div>
  );
}