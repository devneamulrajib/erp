import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Phone, Trash2, Filter as FilterIcon } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmSelectionModal from '../components/ConfirmSelectionModal';
import { getAllFollowUps, deleteFollowUpEntry } from '../api/lead';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function FollowUp() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [needSelection, setNeedSelection] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [filters, setFilters] = useState({ caller: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAllFollowUps();
      setRows(data);
    } catch (err) {
      console.error('Failed to load follow-ups', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q) {
      const matches = (r.name || '').toLowerCase().includes(q)
        || (r.mobile || '').toLowerCase().includes(q)
        || (r.address || '').toLowerCase().includes(q)
        || (r.leadCode || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.caller && r.assignUserName !== filters.caller) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r._id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageRows.some((r) => r._id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageRows.map((r) => r._id)])]);
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function requireSelection() {
    if (selectedIds.length === 0) {
      setNeedSelection(true);
      return false;
    }
    return true;
  }

  async function handleDeleteOne(row) {
    if (!window.confirm('Delete this follow-up entry? This cannot be undone.')) return;
    try {
      await deleteFollowUpEntry(row.leadObjectId, row._id);
      await load();
    } catch (err) {
      console.error('Failed to delete follow-up', err);
      alert('Failed to delete follow-up.');
    }
  }

  async function handleBulkDelete() {
    if (!requireSelection()) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected follow-up(s)? This cannot be undone.`)) return;
    try {
      const targets = rows.filter((r) => selectedIds.includes(r._id));
      await Promise.all(targets.map((r) => deleteFollowUpEntry(r.leadObjectId, r._id)));
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error('Bulk delete failed', err);
      alert('Failed to delete selected follow-ups.');
    }
  }

  return (
    <div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">Call Center <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Follow Up</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={() => setFilterModal(true)} className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5">
              <FilterIcon size={14} /> Filter
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
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
              <th className="px-3 py-2 font-medium">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-2 font-medium">DATE</th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium">CONTACT</th>
              <th className="px-3 py-2 font-medium">NOTE</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">No follow-ups found</td></tr>
            ) : pageRows.map((row, i) => (
              <tr key={row._id} className="border-b border-gray-100 text-sm align-top">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelectOne(row._id)} />
                </td>
                <td className="px-3 py-2">
                  {row.followUpDate ? new Date(row.followUpDate).toLocaleString('en-GB').replace(',', '') : '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="text-indigo-600 font-medium">ID-{row.leadCode}</div>
                  <div>Name-{row.name}</div>
                  <div>Address-{row.address || ''}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.mobile}</div>
                  <div className="text-pink-600 font-medium">Caller-{row.assignUserName || '-'}</div>
                </td>
                <td className="px-3 py-2">{row.note || ''}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <a href={`tel:${row.mobile}`} className="bg-violet-500 hover:bg-violet-600 text-white p-1.5 rounded-md" title="Call"><Phone size={14} /></a>
                    <button onClick={() => handleDeleteOne(row)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md" title="Delete"><Trash2 size={14} /></button>
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
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={`px-3 py-1.5 rounded-md ${n === page ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>{n}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <Modal open={filterModal} title="Filter Follow-ups" onClose={() => setFilterModal(false)}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Caller</label>
            <input
              value={filters.caller}
              onChange={(e) => setFilters((f) => ({ ...f, caller: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => { setFilters({ caller: '' }); setPage(1); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Reset</button>
          <button onClick={() => { setPage(1); setFilterModal(false); }} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Apply</button>
        </div>
      </Modal>

      <ConfirmSelectionModal open={needSelection} onClose={() => setNeedSelection(false)} />
    </div>
  );
}