import { useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search, LayoutGrid, Settings2 } from 'lucide-react';
import Topbar from '../components/Topbar';
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

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

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

  const activeCount = rows.filter((r) => r.status === 'active').length;

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
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Share Configuration Settings', to: '/project-module/share-project/configuration' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Share Configuration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Define share types, assignment rules, and amounts</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Configuration
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Configs</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Active</div>
            <div className="text-xl font-semibold text-emerald-600">{activeCount}</div>
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

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search configurations..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">SL No</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Title/Name</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Project Name</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Share Type</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Task Names</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Assign Type</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Configuration Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No data available in table.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2 text-left"
                        >
                          <Settings2 size={13} className="text-slate-400 flex-shrink-0" />
                          {row.title || '-'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.project !== 'N/A' ? (
                          <span className="text-indigo-600 hover:underline cursor-pointer">
                            {row.project}
                          </span>
                        ) : (
                          <span className="text-slate-500">{row.project}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{row.shareType}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2.5 py-1 text-xs font-medium">
                          {row.taskNames}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{row.assignType}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            row.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 ring-emerald-600/10'
                              : 'bg-amber-50 text-amber-600 ring-amber-600/10'
                          }`}
                        >
                          {row.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
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
                            onClick={() => handleDelete(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredRows.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setCurrentPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === currentPage ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Configuration modal */}
      <Modal
        open={isModalOpen}
        title={editingId ? 'Edit Configuration' : 'Add Configuration'}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Title/Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Name</label>
            <SearchableSelect
              options={projectOptions}
              value={form.project}
              onChange={(v) => handleChange('project', v)}
              placeholder="Select Project"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
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
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Task Names</label>
            <input
              type="text"
              value={form.taskNames}
              onChange={(e) => handleChange('taskNames', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
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
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Configuration Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.configurationAmount}
              onChange={(e) => handleChange('configurationAmount', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>
    </div>
  );
}