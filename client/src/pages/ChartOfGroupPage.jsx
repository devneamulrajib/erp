import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import Modal from '../components/Modal';
import {
  getChartOfGroups, createChartOfGroup, updateChartOfGroup, deleteChartOfGroup,
} from '../api/chartOfGroup';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FORM = { under: '', code: '', name: '' };

export default function ChartOfGroupPage() {
  const [groups, setGroups] = useState([]);
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
      const { data } = await getChartOfGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load chart of groups', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Groups that are already used as a parent can't be deleted from here.
  const parentIds = useMemo(() => new Set(
    groups.filter((g) => g.under).map((g) => g.under?._id || g.under),
  ), [groups]);

  const filtered = groups.filter((g) => {
    if (search && !g.name?.toLowerCase().includes(search.toLowerCase())) return false;
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

  function openEditModal(group) {
    setEditingId(group._id);
    setForm({
      under: group.under?._id || group.under || '',
      code: group.code || '',
      name: group.name || '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code || !form.name) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateChartOfGroup(editingId, form);
      } else {
        await createChartOfGroup(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save chart of group');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this chart of group?')) return;
    try {
      await deleteChartOfGroup(id);
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
            <span className="text-indigo-600">Accounts Module</span>
            <span>&gt;</span>
            <span className="text-gray-700">Chart Of Group</span>
          </div>
          <div className="flex gap-2">
            <Link
              to="/accounts-module/chart-group-hierarchy"
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Group Hierarchy
            </Link>
            <button
              onClick={openAddModal}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              + Chart of Group Add
            </button>
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
              <th className="px-3 py-2 font-medium">CODE</th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium">UNDER</th>
              <th className="px-3 py-2 font-medium">CHART OF SECTION</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((group, i) => (
              <tr key={group._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{group.code}</td>
                <td className="px-3 py-2 text-indigo-600">{group.name}</td>
                <td className="px-3 py-2">{group.under?.name || '-'}</td>
                <td className="px-3 py-2">{group.section}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(group)}
                      className="bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded-md"
                    >
                      <Pencil size={14} />
                    </button>
                    {!parentIds.has(group._id) && (
                      <button
                        onClick={() => handleDelete(group._id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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

      <Modal open={modalOpen} title="Chart of Group" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Under</label>
              <select
                value={form.under}
                onChange={(e) => setForm((f) => ({ ...f, under: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Chart Of Account</option>
                {groups
                  .filter((g) => g._id !== editingId)
                  .map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                required
                placeholder="Code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chart of Group Name</label>
              <input
                required
                placeholder="Chart of Group Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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