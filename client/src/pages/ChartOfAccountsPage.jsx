import { useEffect, useMemo, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import { getChartOfGroupOptions } from '../api/chartOfGroup';
import {
  getChartOfAccounts, createChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
} from '../api/chartOfAccounts';
import { Pencil, Trash2, Search, LayoutGrid, Plus, Tag } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'openingBalance', label: 'Opening Balance' },
  { key: 'under', label: 'Under' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = { id: true, code: true, name: true, openingBalance: true, under: true, action: true };
const CONTACT_TYPES = ['Others', 'Customer', 'Supplier'];
const EMPTY_FORM = {
  chartOfGroup: '', code: '', name: '', isDefault: false, contactType: 'Others',
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChartOfAccounts(groupFilter ? { chartOfGroup: groupFilter } : {});
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load chart of accounts', err);
    } finally {
      setLoading(false);
    }
  }, [groupFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfGroupOptions().then((data) => setGroupOptions(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, groupFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(account) {
    setEditingId(account.id);
    setForm({
      chartOfGroup: account.chartOfGroup?.id || account.chartOfGroupId || '',
      code: account.code || '',
      name: account.name || '',
      isDefault: !!account.isDefault,
      contactType: account.contactType || 'Others',
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.chartOfGroup || !form.code || !form.name) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateChartOfAccount(editingId, form);
      } else {
        await createChartOfAccount(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save chart of account');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account) {
    if (!window.confirm(`Delete chart of account "${account.name}"?`)) return;
    try {
      await deleteChartOfAccount(account.id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  );

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
                { label: 'Accounts Module', to: '/accounts-module/chart-of-accounts' },
                { label: 'Chart of Accounts' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Chart of Accounts</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage the ledger accounts used across your transactions</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add New Chart of Account
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Accounts</div>
            <div className="text-xl font-semibold text-slate-900">{accounts.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pagedRows.length} / {filteredRows.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Under</span>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-w-[160px]"
                >
                  <option value="">All groups</option>
                  {groupOptions.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onClearAll={() => setVisibleColumns({ id: false, code: false, name: false, openingBalance: false, under: false, action: false })}
                onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
              />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {visibleColumns.id && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>}
                  {visibleColumns.code && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>}
                  {visibleColumns.name && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>}
                  {visibleColumns.openingBalance && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Opening Balance</th>}
                  {visibleColumns.under && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Under</th>}
                  {visibleColumns.action && <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No chart of accounts found. Try adjusting your search, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      {visibleColumns.id && <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{account.id}</td>}
                      {visibleColumns.code && (
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                            {account.code}
                          </span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openEditModal(account)}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                          >
                            <Tag size={13} className="text-slate-400" />
                            {account.name}
                          </button>
                        </td>
                      )}
                      {visibleColumns.openingBalance && (
                        <td className="px-5 py-3.5 text-slate-700">{account.openingBalance ?? 0}</td>
                      )}
                      {visibleColumns.under && (
                        <td className="px-5 py-3.5 text-indigo-600">{account.chartOfGroup?.name || '-'}</td>
                      )}
                      {visibleColumns.action && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(account)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(account)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                              title="Delete"
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filteredRows.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredRows.length}</span> entries
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

      <Modal open={modalOpen} title={editingId ? 'Edit Chart of Account' : 'Chart Of Account Add'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart of Group</label>
              <select
                required
                value={form.chartOfGroup}
                onChange={(e) => setForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select value</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart of Accounts Code</label>
              <input
                required
                placeholder="Chart of Accounts Code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart of Accounts Name</label>
              <input
                required
                placeholder="Enter Chart of Accounts Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Set Default Account</label>
              <select
                value={form.isDefault ? 'yes' : 'no'}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.value === 'yes' }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Contact Type <span className="text-slate-400 font-normal">Select the Contact Type to view</span>
            </label>
            <select
              value={form.contactType}
              onChange={(e) => setForm((f) => ({ ...f, contactType: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            >
              {CONTACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}