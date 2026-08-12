import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, User } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import Modal from '../components/Modal';
import { getChartOfGroupOptions } from '../api/chartOfGroup';
import {
  getContacts, getNextContactCode, createContact, updateContact, deleteContact,
} from '../api/contactAccounts';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const EMPTY_FORM = {
  code: '', name: '', mobile: '', email: '', nid: '', address: '',
  buyerReference: '', creditLimit: '', businessName: '', chartOfGroup: '',
};

export default function CustomerAccountsPage() {
  const [items, setItems] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getContacts('Customer');
      setItems(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfGroupOptions().then(({ data }) => setGroupOptions(data)).catch(console.error);
  }, []);

  const filtered = items.filter((c) => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function openAddModal() {
    setEditingId(null);
    setImageFile(null);
    setError('');
    const { data } = await getNextContactCode('Customer');
    setForm({ ...EMPTY_FORM, code: data.code });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setImageFile(null);
    setError('');
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
      chartOfGroup: item.chartOfGroup?._id || item.chartOfGroup || '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.chartOfGroup) return;
    setSaving(true);
    setError('');
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
      setError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await deleteContact(id);
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
            <span className="text-indigo-600">Contact</span>
            <span>&gt;</span>
            <span className="text-gray-700">Customer List</span>
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            + Customer Add
          </button>
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
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">CODE</th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium">BUSINESS</th>
              <th className="px-3 py-2 font-medium">MOBILE</th>
              <th className="px-3 py-2 font-medium">EMAIL</th>
              <th className="px-3 py-2 font-medium">NID/BIRTH CERTIFICATE/PASSPORT</th>
              <th className="px-3 py-2 font-medium">UNDER</th>
              <th className="px-3 py-2 font-medium">IMAGE</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-6 text-gray-400">No entries found</td></tr>
            ) : pageRows.map((item, i) => (
              <tr key={item._id} className="border-b border-gray-100 text-sm">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{item.code}</td>
                <td className="px-3 py-2 text-indigo-600">{item.name}</td>
                <td className="px-3 py-2">{item.businessName}</td>
                <td className="px-3 py-2">{item.mobile}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className="px-3 py-2">{item.nid}</td>
                <td className="px-3 py-2">{item.chartOfGroup?.name || '-'}</td>
                <td className="px-3 py-2">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-md">
                      <User size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-md"
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

      <Modal open={modalOpen} title="Customer" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile *</label>
              <input
                required
                placeholder="Mobile"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NID/Bith Certificate/Passport</label>
              <input
                placeholder="NID"
                value={form.nid}
                onChange={(e) => setForm((f) => ({ ...f, nid: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Buyer Reference</label>
              <input
                placeholder="Buyer Reference"
                value={form.buyerReference}
                onChange={(e) => setForm((f) => ({ ...f, buyerReference: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit Limit</label>
              <input
                type="number"
                placeholder="Credit Limit"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business/Organiztion</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Chart Of Groups *</label>
              <select
                required
                value={form.chartOfGroup}
                onChange={(e) => setForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select One Option</option>
                {groupOptions.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
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