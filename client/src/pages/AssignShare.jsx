import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, UserCog, Plus, Search, LayoutGrid, Share2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import api from '../api/axios';
import { getProjects } from '../api/project';
import { getCustomers } from '../api/customer';
import { getSites } from '../api/site';
import { getFlats } from '../api/flat';

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
  shareAmount: 0,
  paidAmount: 0,
  note: '',
};

const emptyBulkForm = {
  project: '',
  customer: '',
  noOfShare: '',
  note: '',
};

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function AssignShare() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState(emptyAssignForm);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm);

  const [projectTypeOptions, setProjectTypeOptions] = useState([]);
  const [projectListOptions, setProjectListOptions] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [allFlats, setAllFlats] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [optionsError, setOptionsError] = useState(null);

  function fetchShares() {
    setLoading(true);
    return api.get('/assign-share', { params: selectedProject ? { project: selectedProject } : {} })
      .then((r) => setRows(r.data))
      .catch((err) => {
        console.error(err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchShares();
  }, [selectedProject]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const [projectTypesRes, projectsRes, customers, sitesRes, flatsData] = await Promise.all([
          api.get('/project-types'),
          getProjects(),
          getCustomers(),
          getSites(),
          getFlats(),
        ]);

        if (cancelled) return;

        setProjectTypeOptions(projectTypesRes.data.map((t) => ({ value: t.id, label: t.name })));
        setProjectListOptions(projectsRes.data.map((p) => ({ value: p.id, label: p.name })));
        setCustomerOptions(customers.map((c) => ({ value: c.id, label: c.name })));
        setAllSites(sitesRes.data);
        setAllFlats(Array.isArray(flatsData) ? flatsData : flatsData.flats || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setOptionsError('Failed to load some dropdown options.');
      }
    }
    loadOptions();
    return () => { cancelled = true; };
  }, []);

  const siteOptions = useMemo(() => {
    if (!addForm.project) return [];
    return allSites
      .filter((s) => String(s.projectId) === String(addForm.project))
      .map((s) => ({ value: s.id, label: s.name }));
  }, [allSites, addForm.project]);

  const flatLandOptions = useMemo(() => {
    if (!addForm.project) return [];
    return allFlats
      .filter((f) => String(f.projectId) === String(addForm.project))
      .filter((f) => !addForm.site || String(f.siteId) === String(addForm.site))
      .map((f) => ({ value: f.id, label: f.flatLandNo }));
  }, [allFlats, addForm.project, addForm.site]);

  const filteredRows = useMemo(() => {
    let data = rows;
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
  }, [rows, searchTerm]);

  const totalShares = useMemo(
    () => filteredRows.reduce((s, r) => s + (Number(r.noOfShare) || 0), 0),
    [filteredRows]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject, searchTerm, pageSize]);

  function openAddModal() {
    setEditingId(null);
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

  function handleProjectChange(value) {
    setAddForm((prev) => ({ ...prev, project: value, site: '', flatLandNo: '' }));
  }

  function handleSiteChange(value) {
    setAddForm((prev) => ({ ...prev, site: value, flatLandNo: '' }));
  }

  function handleBulkChange(field, value) {
    setBulkForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddSubmit() {
    try {
      if (editingId) {
        await api.put(`/assign-share/${editingId}`, addForm);
      } else {
        await api.post('/assign-share', addForm);
      }
      setIsAddOpen(false);
      setEditingId(null);
      fetchShares();
    } catch (err) {
      console.error(err);
      alert('Failed to save assign share.');
    }
  }

  async function handleBulkSubmit() {
    try {
      const noOfShare = Number(bulkForm.noOfShare) || 0;
      await api.post('/assign-share', {
        project: bulkForm.project,
        customer: bulkForm.customer,
        noOfShare,
        note: bulkForm.note,
        shareCode: generateShareCode(),
      });
      setIsBulkOpen(false);
      fetchShares();
    } catch (err) {
      console.error(err);
      alert('Failed to save bulk assign share.');
    }
  }

  function handleEdit(row) {
    setEditingId(row.id);
    setAddForm({
      projectType: row.projectType || '',
      project: row.projectId || '',
      shareCode: row.shareCode || generateShareCode(),
      site: row.site || '',
      flatLandNo: row.flatLandNo || '',
      customer: row.customerId || '',
      noOfShare: row.noOfShare || 0,
      shareAmount: row.shareAmount || 0,
      paidAmount: row.paidAmount || 0,
      note: row.note || '',
    });
    setIsAddOpen(true);
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this share assignment?')) return;
    try {
      await api.delete(`/assign-share/${row.id}`);
      fetchShares();
    } catch (err) {
      console.error(err);
      alert('Failed to delete.');
    }
  }

  function handleViewPartners(row) {
    console.log('View partners for row:', row);
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
                { label: 'Share Project', to: '/project-module/share-project/assign-share' },
                { label: 'Assign Share List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Assign Share</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage shareholder assignments across your projects</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Assign Share
            </button>
            <button
              type="button"
              onClick={openBulkModal}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Bulk Assign Share
            </button>
          </div>
        </div>

        {optionsError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
            {optionsError}
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Assignments</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Shares</div>
            <div className="text-xl font-semibold text-slate-900">{totalShares}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Project</label>
            <SearchableSelect
              options={projectListOptions}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="Select Project"
              clearable
            />
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
                placeholder="Search shares..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Share Code</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">No Of Share</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Flat/Land</th>
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No matching records found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.project}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.code}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.shareCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer hover:underline underline-offset-2">
                          <Share2 size={13} className="text-slate-400" />
                          {row.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{row.noOfShare}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.flatLand || '-'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
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
                          <button
                            type="button"
                            onClick={() => handleViewPartners(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
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

      {/* ---- Add Assign Share modal ---- */}
      <Modal open={isAddOpen} title={editingId ? 'Edit Assign Share' : 'Assign Share'} onClose={() => { setIsAddOpen(false); setEditingId(null); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Project Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectTypeOptions}
              value={addForm.projectType}
              onChange={(v) => handleAddChange('projectType', v)}
              placeholder="Select Project Type"
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Project <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectListOptions}
              value={addForm.project}
              onChange={handleProjectChange}
              placeholder="Select Project"
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Share Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addForm.shareCode}
              onChange={(e) => handleAddChange('shareCode', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Site</label>
            <SearchableSelect
              options={siteOptions}
              value={addForm.site}
              onChange={handleSiteChange}
              placeholder={addForm.project ? 'Select Site' : 'Select a Project first'}
              disabled={!addForm.project}
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Flat/Land No</label>
            <SearchableSelect
              options={flatLandOptions}
              value={addForm.flatLandNo}
              onChange={(v) => handleAddChange('flatLandNo', v)}
              placeholder={addForm.project ? 'Select Flat/Land No' : 'Select a Project first'}
              disabled={!addForm.project}
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={customerOptions}
              value={addForm.customer}
              onChange={(v) => handleAddChange('customer', v)}
              placeholder="Select Customer"
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              No Of Share <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={addForm.noOfShare}
              onChange={(e) => handleAddChange('noOfShare', Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Share Amount</label>
            <input
              type="number"
              min={0}
              value={addForm.shareAmount}
              onChange={(e) => handleAddChange('shareAmount', Number(e.target.value))}
              placeholder="Total value of shares"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Paid Amount</label>
            <input
              type="number"
              min={0}
              value={addForm.paidAmount}
              onChange={(e) => handleAddChange('paidAmount', Number(e.target.value))}
              placeholder="Amount received so far"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Note</label>
            <input
              type="text"
              value={addForm.note}
              onChange={(e) => handleAddChange('note', e.target.value)}
              placeholder="Note"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => { setIsAddOpen(false); setEditingId(null); }}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleAddSubmit}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>

      {/* ---- Bulk Assign Share modal ---- */}
      <Modal open={isBulkOpen} title="Bulk Assign Share" onClose={() => setIsBulkOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Project <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={projectListOptions}
              value={bulkForm.project}
              onChange={(v) => handleBulkChange('project', v)}
              placeholder="Select Project"
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={customerOptions}
              value={bulkForm.customer}
              onChange={(v) => handleBulkChange('customer', v)}
              placeholder="Select Customer"
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              No Of Share <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={bulkForm.noOfShare}
              onChange={(e) => handleBulkChange('noOfShare', e.target.value)}
              placeholder="No Of Share"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Note</label>
            <input
              type="text"
              value={bulkForm.note}
              onChange={(e) => handleBulkChange('note', e.target.value)}
              placeholder="Note"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsBulkOpen(false)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleBulkSubmit}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-colors"
          >
            Submit
          </button>
        </div>
      </Modal>
    </div>
  );
}