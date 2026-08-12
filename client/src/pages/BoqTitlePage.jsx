import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBoqTitles();
      setTitles(data);
    } catch (err) {
      console.error('Failed to load boq titles', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getProjectTypeOptions().then(({ data }) => setProjectTypeOptions(data)).catch(console.error);
  }, []);

  const filtered = titles.filter((t) => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      projectType: item.projectType?._id || item.projectType || '',
      title: item.title || '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
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

  async function handleDelete(id) {
    if (!window.confirm('Delete this Boq Title?')) return;
    try {
      await deleteBoqTitle(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600">Accounts</span>
            <span>&gt;</span>
            <span className="text-gray-700">Boq Title List</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openAddModal}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              + Title Add
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              <ArrowLeft size={15} /> Back to Previous
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 text-sm">
            Search:
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-1.5"
            />
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-500 text-white text-left text-sm">
              <th className="px-3 py-2 font-medium">SL</th>
              <th className="px-3 py-2 font-medium">PROJECT TYPE</th>
              <th className="px-3 py-2 font-medium">TITLE</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((item, i) => (
              <tr key={item._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{item.projectType?.name || '-'}</td>
                <td className="px-3 py-2">{item.title}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded-md"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
            {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-md ${n === page ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} title="Boq Title" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Type</label>
              <select
                value={form.projectType}
                onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select value</option>
                {projectTypeOptions.map((pt) => (
                  <option key={pt._id} value={pt._id}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Boq Title *</label>
              <input
                required
                placeholder="Boq Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-md"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}