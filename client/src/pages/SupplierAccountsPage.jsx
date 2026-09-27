import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import PortalAccessModal from '../components/PortalAccessModal';
import { getChartOfGroupOptions } from '../api/chartOfGroup';
import {
  getContacts, getNextContactCode, createContact, updateContact, deleteContact,
} from '../api/contactAccounts';
import { Pencil, Trash2, User, Search, Plus, LayoutGrid, Building2, Eye, Mail, Phone, MapPin, CreditCard, Calendar, KeyRound, Users, ListFilter, X } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const EMPTY_FORM = {
  code: '', name: '', businessName: '', email: '', mobile: '',
  address: '', creditLimit: '', dueDate: '', chartOfGroup: '',
};

function SummaryCard({ label, value, icon, tone, onClick, active }) {
  const tones = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/25',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/25',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl px-4 py-3.5 text-left bg-gradient-to-br ${tones[tone]} shadow-lg ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform' : ''
      } ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">{label}</span>
        <span className="text-white/70">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10" />
    </Comp>
  );
}

export default function SupplierAccountsPage() {
  const [items, setItems] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [viewItem, setViewItem] = useState(null);
  const [portalItem, setPortalItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getContacts('Supplier', groupFilter ? { chartOfGroup: groupFilter } : {});
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load suppliers', err);
    } finally {
      setLoading(false);
    }
  }, [groupFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfGroupOptions()
      .then((data) => setGroupOptions(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filtered = useMemo(() => items.filter((c) => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const activeGroupName = groupOptions.find((g) => String(g.id) === String(groupFilter))?.name;

  async function openAddModal() {
    setEditingId(null);
    setError('');
    const { data } = await getNextContactCode('Supplier');
    setForm({ ...EMPTY_FORM, code: data.code });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setError('');
    setForm({
      code: item.code || '',
      name: item.name || '',
      businessName: item.businessName || '',
      email: item.email || '',
      mobile: item.mobile || '',
      address: item.address || '',
      creditLimit: item.creditLimit ?? '',
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
      chartOfGroup: item.chartOfGroup?.id || item.chartOfGroup || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openViewModal(item) {
    setViewItem(item);
  }

  function closeViewModal() {
    setViewItem(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.chartOfGroup) return;
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => fd.append(key, val ?? ''));
      fd.append('contactType', 'Supplier');

      if (editingId) {
        await updateContact(editingId, fd);
      } else {
        await createContact(fd);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await deleteContact(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

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
                { label: 'Contact', to: '/accounts-module/supplier-accounts' },
                { label: 'Supplier List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Supplier Accounts</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your supplier contacts and account details</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Supplier Add
          </button>
        </div>

        {/* Summary strip + Chart of Group filter, combined into one row */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
            <SummaryCard
              label="Total Suppliers"
              value={items.length}
              icon={<Users size={16} />}
              tone="indigo"
              active={!groupFilter}
              onClick={groupFilter ? () => setGroupFilter('') : undefined}
            />
            <SummaryCard
              label="Matching Search"
              value={filtered.length}
              icon={<Search size={16} />}
              tone="emerald"
            />
            <SummaryCard
              label="Showing"
              value={`${pageRows.length} / ${filtered.length}`}
              icon={<LayoutGrid size={16} />}
              tone="violet"
            />
          </div>

          <div className="lg:w-64 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col justify-center">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
              <ListFilter size={12} /> Chart Of Group
            </label>
            <div className="relative">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition appearance-none"
              >
                <option value="">All groups</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {groupFilter && (
                <button
                  type="button"
                  onClick={() => setGroupFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Clear filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeGroupName && (
          <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
            <span>Filtering by:</span>
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium ring-1 ring-inset ring-indigo-600/10">
              {activeGroupName}
              <button onClick={() => setGroupFilter('')} className="hover:text-indigo-800">
                <X size={11} />
              </button>
            </span>
          </div>
        )}

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
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Phone</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Address</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Under</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No suppliers found. Try adjusting your search, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((item, i) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                        >
                          <Building2 size={13} className="text-slate-400" />
                          {item.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{item.businessName || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{item.mobile || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{item.email || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-[160px] truncate" title={item.address || ''}>
                        {item.address || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-[140px] truncate" title={item.chartOfGroup?.name || ''}>
                        {item.chartOfGroup?.name || '-'}
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
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setPortalItem(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors"
                            title="Portal Access"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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

      <Modal open={modalOpen} title={editingId ? 'Edit Supplier' : 'Supplier'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
              <input
                required
                placeholder="Enter Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Business/Organization</label>
              <input
                placeholder="Enter Business Name"
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input
                placeholder="Enter E-mail"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone/Mobile</label>
              <input
                placeholder="Enter Phone/Mobile"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
              <input
                placeholder="Enter Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Credit Limit</label>
              <input
                type="number"
                placeholder="Enter Credit Limit"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Under</label>
            <select
              required
              value={form.chartOfGroup}
              onChange={(e) => setForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            >
              <option value="">Select One Option</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewItem} title="Supplier Details" onClose={closeViewModal}>
        {viewItem && (
          <div>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                <Building2 size={24} />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{viewItem.name}</div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10 mt-1">
                  {viewItem.code}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex items-start gap-2.5">
                <Phone size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Phone/Mobile</div>
                  <div className="text-sm text-slate-800">{viewItem.mobile || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">E-mail</div>
                  <div className="text-sm text-slate-800">{viewItem.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Address</div>
                  <div className="text-sm text-slate-800">{viewItem.address || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Business/Organization</div>
                  <div className="text-sm text-slate-800">{viewItem.businessName || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CreditCard size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Credit Limit</div>
                  <div className="text-sm text-slate-800">{viewItem.creditLimit ?? '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Due Date</div>
                  <div className="text-sm text-slate-800">{viewItem.dueDate ? viewItem.dueDate.slice(0, 10) : '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Chart Of Group (Under)</div>
                  <div className="text-sm text-slate-800">{viewItem.chartOfGroup?.name || '-'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeViewModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PortalAccessModal
        open={!!portalItem}
        customer={portalItem}
        onClose={() => setPortalItem(null)}
        onSuccess={load}
        onNeedsEmail={(c) => {
          setPortalItem(null);
          openEditModal(c);
        }}
      />
    </div>
  );
}