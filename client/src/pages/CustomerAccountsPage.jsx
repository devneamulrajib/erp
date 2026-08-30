import { useEffect, useMemo, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import { getChartOfGroupOptions } from '../api/chartOfGroup';
import {
  getContacts, getNextContactCode, createContact, updateContact, deleteContact,
} from '../api/contactAccounts';
import { Pencil, Trash2, Search, Users, Plus, User, Building2 } from 'lucide-react';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'business', label: 'Business' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'nid', label: 'NID' },
  { key: 'under', label: 'Under' },
  { key: 'image', label: 'Image' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});

const EMPTY_FORM = {
  code: '', name: '', mobile: '', email: '', nid: '', address: '',
  buyerReference: '', creditLimit: '', businessName: '', chartOfGroup: '',
};

export default function CustomerAccountsPage() {
  const [items, setItems] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getContacts('Customer');
      setItems(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfGroupOptions().then(({ data }) => setGroupOptions(data)).catch(console.error);
  }, []);

  async function openCreateModal() {
    setEditingId(null);
    setImageFile(null);
    setFormError('');
    setForm(EMPTY_FORM);
    setModalOpen(true);
    try {
      const { data } = await getNextContactCode('Customer');
      setForm((f) => ({ ...f, code: data.code }));
    } catch {
      setForm((f) => ({ ...f, code: '' }));
    }
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setImageFile(null);
    setFormError('');
    setForm({
      code: item.code || '',
      name: item.name || '',
      mobile: item.mobile || '',
      email: item.email || '',
      nid: item.nid || '',
      address: item.address || '',
      buyerReference: item.buyerReference || '',
      creditLimit: item.creditLimit ?? '',
      businessName: item.businessName || '',
      chartOfGroup: item.chartOfGroup?.id || item.chartOfGroup || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.chartOfGroup) return;
    setSubmitting(true);
    setFormError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => fd.append(key, val ?? ''));
      fd.append('contactType', 'Customer');
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await updateContact(editingId, fd);
      } else {
        await createContact(fd);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete customer "${item.name}"?`)) return;
    setDeletingId(item.id);
    try {
      await deleteContact(item.id);
      setItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete customer.');
    } finally {
      setDeletingId(null);
    }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q) ||
        r.mobile?.toLowerCase().includes(q) ||
        r.businessName?.toLowerCase().includes(q)
    );
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

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
                { label: 'Contact', to: '/dashboard/accounts' },
                { label: 'Customer Accounts' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Customer Accounts</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your customer contacts and account details</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Customer
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Customers</div>
            <div className="text-xl font-semibold text-slate-900">{items.length}</div>
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

            <div className="flex items-center gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onClearAll={() => setVisibleColumns(
                  COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: false }), {})
                )}
                onSelectAll={() => setVisibleColumns(ALL_VISIBLE)}
              />
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
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
                  {visibleColumns.business && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Business</th>}
                  {visibleColumns.mobile && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Mobile</th>}
                  {visibleColumns.email && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Email</th>}
                  {visibleColumns.nid && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">NID</th>}
                  {visibleColumns.under && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Under</th>}
                  {visibleColumns.image && <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Image</th>}
                  {visibleColumns.action && <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-16 text-slate-400">Loading...</td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={28} strokeWidth={1.5} />
                        <p className="text-sm">No customers found. Try adjusting your search, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      {visibleColumns.id && (
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                          #{(page - 1) * pageSize + i + 1}
                        </td>
                      )}
                      {visibleColumns.code && (
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                            {row.code}
                          </span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openEditModal(row)}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                          >
                            <User size={13} className="text-slate-400" />
                            {row.name}
                          </button>
                        </td>
                      )}
                      {visibleColumns.business && (
                        <td className="px-5 py-3.5 text-slate-600">{row.businessName || '-'}</td>
                      )}
                      {visibleColumns.mobile && (
                        <td className="px-5 py-3.5 text-slate-600">{row.mobile}</td>
                      )}
                      {visibleColumns.email && (
                        <td className="px-5 py-3.5 text-slate-600">{row.email || '-'}</td>
                      )}
                      {visibleColumns.nid && (
                        <td className="px-5 py-3.5 text-slate-600">{row.nid || '-'}</td>
                      )}
                      {visibleColumns.under && (
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs">
                            <Building2 size={12} className="text-slate-400" />
                            {row.chartOfGroup?.name || '-'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.image && (
                        <td className="px-5 py-3.5">
                          {row.image ? (
                            <img src={row.image} alt={row.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                              <User size={14} />
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.action && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(row)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              disabled={deletingId === row.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
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

      <Modal open={modalOpen} title={editingId ? 'Edit Customer' : 'New Customer'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                readOnly={!!editingId}
                placeholder="Code"
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono transition ${
                  editingId
                    ? 'bg-slate-50 text-slate-500'
                    : 'bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Customer name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Mobile</label>
              <input
                required
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="Mobile"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">NID/Birth Cert./Passport</label>
              <input
                value={form.nid}
                onChange={(e) => setForm((f) => ({ ...f, nid: e.target.value }))}
                placeholder="NID"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Buyer Reference</label>
              <input
                value={form.buyerReference}
                onChange={(e) => setForm((f) => ({ ...f, buyerReference: e.target.value }))}
                placeholder="Buyer reference"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Credit Limit</label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                placeholder="Credit limit"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Business/Organization</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                placeholder="Business name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart Of Group</label>
              <select
                required
                value={form.chartOfGroup}
                onChange={(e) => setForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select one option</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
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
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}