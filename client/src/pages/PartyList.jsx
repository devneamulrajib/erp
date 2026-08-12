import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, X } from 'lucide-react';

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
    // Populate the Agreement select. If you don't have this endpoint yet,
    // this call will just fail silently and the dropdown will be empty.
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
      agreementId: party.agreementId || '',
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

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="p-4">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Link to="/dashboard" className="hover:text-indigo-600">Home</Link>
            <span>&gt;</span>
            <Link to="/dashboard" className="hover:text-indigo-600">Accounts Module</Link>
            <span>&gt;</span>
            <span className="text-gray-700 font-medium">Party List</span>
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            + Party Add
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Search:</span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white text-left">
                <th className="px-4 py-2 font-medium">SL</th>
                <th className="px-4 py-2 font-medium">NAME</th>
                <th className="px-4 py-2 font-medium">PHONE</th>
                <th className="px-4 py-2 font-medium">EMAIL</th>
                <th className="px-4 py-2 font-medium">TYPE</th>
                <th className="px-4 py-2 font-medium">AGREEMENT</th>
                <th className="px-4 py-2 font-medium">USER</th>
                <th className="px-4 py-2 font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No parties found
                  </td>
                </tr>
              )}

              {!loading && paged.map((party, idx) => (
                <tr key={party._id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-4 py-2">{party.name}</td>
                  <td className="px-4 py-2">{party.phone}</td>
                  <td className="px-4 py-2">{party.email}</td>
                  <td className="px-4 py-2">{party.type}</td>
                  <td className="px-4 py-2">{party.agreementLabel || party.agreementId}</td>
                  <td className="px-4 py-2">{party.userName || 'Admin'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(party)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white p-1.5 rounded"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(party._id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-500">
            <span>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1 rounded bg-indigo-500 text-white">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
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
          <div className="bg-white rounded-lg w-full max-w-3xl mx-4 p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-5">
              {editingId ? 'Edit Party' : 'Add New Party'}
            </h2>

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
                <select
                  value={form.agreementId}
                  onChange={(e) => handleChange('agreementId', e.target.value)}
                  className="input"
                >
                  <option value="">Select Agreement</option>
                  {agreements.map((a) => (
                    <option key={a._id} value={a._id}>{a.title || a.name}</option>
                  ))}
                </select>
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
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60"
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
          border: 1px solid #d1d5db;
          border-radius: 6px;
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
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}