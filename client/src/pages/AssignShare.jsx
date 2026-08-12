import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, UserCog, Plus } from 'lucide-react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

// TODO: replace with your real api client, e.g. import api from '../api/axios';

function generateShareCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SHR-${rand}`;
}

const emptyAssignForm = {
  projectType: '',
  project: '',
  shareCode: generateShareCode(),
  site: '',
  flatLandNo: '',
  customer: '',
  noOfShare: 0,
  note: '',
};

const emptyBulkForm = {
  project: '',
  customer: '',
  noOfShare: '',
  note: '',
};

export default function AssignShare() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAssignForm);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm);

  // Dropdown option lists — wire these to real endpoints
  const [projectTypeOptions, setProjectTypeOptions] = useState([]);
  const [projectListOptions, setProjectListOptions] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [flatLandOptions, setFlatLandOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);

  // ---- Data fetch (replace with real API calls) ----
  useEffect(() => {
    let cancelled = false;
    async function loadShares() {
      setLoading(true);
      try {
        // const { data } = await api.get('/project-module/assign-share');
        // if (!cancelled) setRows(data);

        // Mock data matching current screenshot until API is wired up:
        const mock = [
          { id: 1, project: 'Home', code: 'CUS5752053', shareCode: 'SHR-611290', name: 'Masum', noOfShare: 2, flatLand: '' },
          { id: 2, project: 'Abashon', code: 'CUS3719288', shareCode: 'SH-B8C9502BAC', name: 'Mostafa', noOfShare: 3, flatLand: '' },
          { id: 3, project: 'Head Office', code: 'CUS3719288', shareCode: 'SHR-120868', name: 'Mostafa', noOfShare: 3, flatLand: '' },
          { id: 4, project: 'Abashik', code: 'CUS6877196', shareCode: 'SHR-972775', name: 'Hassan', noOfShare: 1, flatLand: '' },
        ];
        if (!cancelled) setRows(mock);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadShares();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // TODO: replace with real fetches, e.g.:
    // api.get('/project-module/project-type').then(({ data }) =>
    //   setProjectTypeOptions(data.map((t) => ({ value: t.id, label: t.name })))
    // );
    setProjectTypeOptions([
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
    ]);
    setSiteOptions([]);
    setFlatLandOptions([]);
    setCustomerOptions([]);
  }, []);

  // Keep the "Project" dropdown options in sync with rows already loaded,
  // until you wire this to a real /project-module/projects endpoint.
  useEffect(() => {
    const uniqueProjects = Array.from(new Set(rows.map((r) => r.project)));
    setProjectListOptions(uniqueProjects.map((p) => ({ value: p, label: p })));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let data = rows;
    if (selectedProject) {
      data = data.filter((r) => r.project === selectedProject);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      data = data.filter((r) =>
        [r.project, r.code, r.shareCode, r.name, String(r.noOfShare), r.flatLand]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );
    }
    return data;
  }, [rows, selectedProject, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject, searchTerm, pageSize]);

  // ---- Handlers ----
  function openAddModal() {
    setAddForm({ ...emptyAssignForm, shareCode: generateShareCode() });
    setIsAddOpen(true);
  }

  function openBulkModal() {
    setBulkForm(emptyBulkForm);
    setIsBulkOpen(true);
  }

  function handleAddChange(field, value) {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBulkChange(field, value) {
    setBulkForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddSubmit() {
    // TODO: await api.post('/project-module/assign-share', addForm);
    console.log('Submitting Assign Share:', addForm);
    setIsAddOpen(false);
  }

  async function handleBulkSubmit() {
    // TODO: await api.post('/project-module/assign-share/bulk', bulkForm);
    console.log('Submitting Bulk Assign Share:', bulkForm);
    setIsBulkOpen(false);
  }

  function handleEdit(row) {
    // Pre-fill the Add Assign Share modal with this row's data for editing
    setAddForm({
      projectType: row.projectType || '',
      project: row.project || '',
      shareCode: row.shareCode || generateShareCode(),
      site: row.site || '',
      flatLandNo: row.flatLandNo || '',
      customer: row.customerId || '',
      noOfShare: row.noOfShare || 0,
      note: row.note || '',
    });
    setIsAddOpen(true);
  }

  function handleDelete(row) {
    // TODO: confirm + await api.delete(`/project-module/assign-share/${row.id}`)
    console.log('Delete row:', row);
  }

  function handleViewPartners(row) {
    // TODO: navigate to partner detail view for this share
    console.log('View partners for row:', row);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Share Project', to: '/project-module/share-project/assign-share' },
            { label: 'Assign Share List' },
          ]}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={15} />
            Add Assign Share
          </button>
          <button
            type="button"
            onClick={openBulkModal}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={15} />
            Bulk Assign Share
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        {/* Project filter */}
        <div className="mb-5 max-w-xs">
          <label className="block text-sm text-gray-600 mb-1">Select Project</label>
          <SearchableSelect
            options={projectListOptions}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select Project"
          />
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
                <th className="px-4 py-3 font-medium">SL</th>
                <th className="px-4 py-3 font-medium">PROJECT</th>
                <th className="px-4 py-3 font-medium">CODE</th>
                <th className="px-4 py-3 font-medium">SHARE CODE</th>
                <th className="px-4 py-3 font-medium">NAME</th>
                <th className="px-4 py-3 font-medium">NO OF SHARE</th>
                <th className="px-4 py-3 font-medium">FLAT/LAND</th>
                <th className="px-4 py-3 font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">{row.project}</td>
                    <td className="px-4 py-3">{row.code}</td>
                    <td className="px-4 py-3">{row.shareCode}</td>
                    <td className="px-4 py-3">
                      <span className="text-indigo-600 hover:underline cursor-pointer">
                        {row.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.noOfShare}</td>
                    <td className="px-4 py-3">{row.flatLand}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
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
                        <button
                          type="button"
                          onClick={() => handleViewPartners(row)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-md transition-colors"
                          title="Partners"
                        >
                          <UserCog size={14} />
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

      {/* ---- Add Assign Share modal ---- */}
      <Modal open={isAddOpen} title="Assign Share" onClose={() => setIsAddOpen(false)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Project Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectTypeOptions}
              value={addForm.projectType}
              onChange={(v) => handleAddChange('projectType', v)}
              placeholder="Select Project Type"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectListOptions}
              value={addForm.project}
              onChange={(v) => handleAddChange('project', v)}
              placeholder="Select Project"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Share Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addForm.shareCode}
              onChange={(e) => handleAddChange('shareCode', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Site</label>
            <SearchableSelect
              options={siteOptions}
              value={addForm.site}
              onChange={(v) => handleAddChange('site', v)}
              placeholder="Select Site"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Flat/Land No</label>
            <SearchableSelect
              options={flatLandOptions}
              value={addForm.flatLandNo}
              onChange={(v) => handleAddChange('flatLandNo', v)}
              placeholder="Select Flat/Land No"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={customerOptions}
              value={addForm.customer}
              onChange={(v) => handleAddChange('customer', v)}
              placeholder="Select Customer"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              No Of Share <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={addForm.noOfShare}
              onChange={(e) => handleAddChange('noOfShare', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Note</label>
            <input
              type="text"
              value={addForm.note}
              onChange={(e) => handleAddChange('note', e.target.value)}
              placeholder="Note"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setIsAddOpen(false)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleAddSubmit}
            className="px-4 py-2 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>

      {/* ---- Bulk Assign Share modal ---- */}
      <Modal open={isBulkOpen} title="Bulk Assign Share" onClose={() => setIsBulkOpen(false)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectListOptions}
              value={bulkForm.project}
              onChange={(v) => handleBulkChange('project', v)}
              placeholder="Select Project"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={customerOptions}
              value={bulkForm.customer}
              onChange={(v) => handleBulkChange('customer', v)}
              placeholder="Select Customer"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              No Of Share <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={bulkForm.noOfShare}
              onChange={(e) => handleBulkChange('noOfShare', e.target.value)}
              placeholder="No Of Share"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Note</label>
            <input
              type="text"
              value={bulkForm.note}
              onChange={(e) => handleBulkChange('note', e.target.value)}
              placeholder="Note"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setIsBulkOpen(false)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleBulkSubmit}
            className="px-4 py-2 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>
    </div>
  );
}