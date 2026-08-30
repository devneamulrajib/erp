import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import SearchableSelect from '../components/SearchableSelect';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, X, Plus, Search, ChevronDown, User } from 'lucide-react';

const TYPE_OPTIONS = ['First Party', 'Second Party'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  nid: '',
  position: '',
  address: '',
  agreementId: '',
  type: '',
  status: '',
  details: '',
  image: null,
};

export default function PartyList() {
  const [parties, setParties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchParties();
    api.get('/agreements').then((r) => setAgreements(r.data)).catch(() => {});
  }, []);

  function fetchParties() {
    setLoading(true);
    api
      .get('/party-list')
      .then((r) => setParties(r.data))
      .catch(() => setParties([]))
      .finally(() => setLoading(false));
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(party) {
    setEditingId(party._id);
    setForm({
      name: party.name || '',
      phone: party.phone || '',
      email: party.email || '',
      nid: party.nid || '',
      position: party.position || '',
      address: party.address || '',
      agreementId: party.agreementId ? String(party.agreementId) : '',
      type: party.type || '',
      status: party.status || '',
      details: party.details || '',
      image: null,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== '') payload.append(key, value);
      });

      if (editingId) {
        await api.put(`/party-list/${editingId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/party-list', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeModal();
      fetchParties();
    } catch (err) {
      console.error('Failed to save party:', err);
      alert('Failed to save party. Please check the form and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this party? This cannot be undone.')) return;
    try {
      await api.delete(`/party-list/${id}`);
      fetchParties();
    } catch (err) {
      console.error('Failed to delete party:', err);
      alert('Failed to delete party.');
    }
  }

  const filtered = parties.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const agreementOptions = agreements.map((a) => ({
    value: String(a.id ?? a._id),
    label: a.title || a.reference || `Agreement #${a.id ?? a._id}`,
  }));

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="px-6 pt-6 pb-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Link to="/dashboard" className="hover:text-indigo-600">Home</Link>
              <span>&gt;</span>
              <Link to="/dashboard" className="hover:text-indigo-600">Accounts Module</Link>
              <span>&gt;</span>
              <span className="text-gray-700 font-medium">Party List</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Party List</h1>
            <p className="text-sm text-gray-500 mt-1">Manage the parties linked to your agreements</p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Party
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Parties</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{parties.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Matching Search</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Showing</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {paged.length} / {filtered.length}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-gray-500">entries</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Select Columns
                <ChevronDown size={14} />
              </button>

              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search parties..."
                  className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100">
                  {['ID', 'Name', 'Phone', 'Email', 'Type', 'Agreement', 'User', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading && paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No parties found
                    </td>
                  </tr>
                )}

                {!loading && paged.map((party, idx) => (
                  <tr key={party._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-400">#{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-indigo-600">
                        <User size={14} className="text-indigo-400" />
                        {party.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{party.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{party.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-1">
                        {party.type || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{party.agreementLabel || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{party.userName || 'Admin'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEditModal(party)}
                          title="Edit"
                          className="bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(party._id)}
                          title="Delete"
                          className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 p-2 rounded-lg border border-gray-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 flex-wrap gap-3">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:hover:text-gray-400"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:hover:text-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-4 p-6 relative border border-gray-200 shadow-lg">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {editingId ? 'Edit Party' : 'Add New Party'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {editingId ? 'Update the details of this party' : 'Fill in the details to add a new party'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Type name"
                  className="input"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Type Phone"
                  className="input"
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Type Email"
                  className="input"
                />
              </Field>
              <Field label="Nid">
                <input
                  value={form.nid}
                  onChange={(e) => handleChange('nid', e.target.value)}
                  placeholder="Type Nid"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Field label="Position">
                <input
                  value={form.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  placeholder="Type Position"
                  className="input"
                />
              </Field>
              <Field label="Image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleChange('image', e.target.files[0])}
                  className="text-sm"
                />
              </Field>
              <Field label="Address">
                <input
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Type address"
                  className="input"
                />
              </Field>
              <Field label="Agreement">
                <SearchableSelect
                  options={agreementOptions}
                  value={form.agreementId}
                  onChange={(val) => handleChange('agreementId', val)}
                  placeholder="Select Agreement"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label="Type">
                <select
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="input"
                >
                  <option value="">Select Type</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="input"
                >
                  <option value="">Select Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Details">
              <textarea
                value={form.details}
                onChange={(e) => handleChange('details', e.target.value)}
                rows={6}
                placeholder="Type details..."
                className="input resize-y"
              />
            </Field>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tiny local styles for the input class used above */}
      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
        }
        .input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}