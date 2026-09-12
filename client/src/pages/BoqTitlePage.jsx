import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, LayoutGrid, Plus, Tag, Eye } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  getBoqTitles, createBoqTitle, updateBoqTitle, deleteBoqTitle, getProjectTypeOptions,
} from '../api/boqTitle';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = { projectType: '', title: '' };

export default function BoqTitlePage() {
  const [titles, setTitles] = useState([]);
  const [projectTypeOptions, setProjectTypeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBoqTitles();
      const list = Array.isArray(data) ? data : (data?.rows || data?.titles || []);
      setTitles(list);
    } catch (err) {
      console.error('Failed to load boq titles', err);
      setTitles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getProjectTypeOptions()
      .then((data) => setProjectTypeOptions(Array.isArray(data) ? data : (data?.rows || data?.projectTypes || [])))
      .catch(console.error);
  }, []);

  const filtered = titles.filter((t) => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  function openAddModal() {
    setEditingId(null);
    setViewOnly(false);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id || item.id);
    setViewOnly(false);
    setForm({
      projectType: item.projectType?._id || item.projectType?.id || item.projectType || '',
      title: item.title || '',
    });
    setError('');
    setModalOpen(true);
  }

  function openViewModal(item) {
    setEditingId(item._id || item.id);
    setViewOnly(true);
    setForm({
      projectType: item.projectType?._id || item.projectType?.id || item.projectType || '',
      title: item.title || '',
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (viewOnly) return;
    if (!form.projectType || !form.title) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateBoqTitle(editingId, form);
      } else {
        await createBoqTitle(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteBoqTitle(item._id || item.id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  const fieldClass =
    'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition disabled:bg-slate-50 disabled:text-slate-500';

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
                { label: 'Accounts', to: '/dashboard' },
                { label: 'BOQ Title List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">BOQ Titles</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage Bill of Quantities titles by project type</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Title
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Titles</div>
            <div className="text-xl font-semibold text-slate-900">{titles.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pageRows.length} / {filtered.length}</div>
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
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Project Type</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No titles found. Try adjusting your search, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((item, i) => (
                    <tr key={item._id || item.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5">
                        {item.projectType?.name ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-medium">
                            {item.projectType.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => openViewModal(item)}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                        >
                          <Tag size={13} className="text-slate-400" />
                          {item.title}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openViewModal(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
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
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
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

      <Modal
        open={modalOpen}
        title={viewOnly ? 'View BOQ Title' : editingId ? 'Edit BOQ Title' : 'Add BOQ Title'}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project Type *</label>
              <select
                required
                disabled={viewOnly}
                value={form.projectType}
                onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Select Project Type</option>
                {projectTypeOptions.map((pt) => (
                  <option key={pt._id || pt.id} value={pt._id || pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">BOQ Title *</label>
              <input
                required
                disabled={viewOnly}
                placeholder="BOQ Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            {!viewOnly && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
              >
                {saving ? 'Saving...' : 'Submit'}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}