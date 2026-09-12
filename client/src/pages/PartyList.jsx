import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import SearchableSelect from '../components/SearchableSelect';
import {
  Pencil, Trash2, X, Plus, Search, ChevronDown, User, Eye,
  Upload, ImageIcon, CheckCircle2, Users, Mail, Phone, MapPin, IdCard, Briefcase, FileText,
} from 'lucide-react';

const TYPE_OPTIONS = ['First Party', 'Second Party'];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const PAGE_SIZES = [10, 25, 50, 100];

// Backend serves uploaded files from its own origin (e.g. localhost:5000),
// not the Vite dev server (localhost:5173) — so relative "/uploads/..."
// paths must be prefixed with the API's origin before use in <img src>.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const imageUrl = (img) => (img ? `${API_ORIGIN}${img}` : null);

const EMPTY_FORM = {
  name: '', phone: '', email: '', nid: '', position: '',
  address: '', agreementId: '', type: '', status: '', details: '', image: null,
};

const BASIC_FIELDS = [
  ['name', 'Name', 'Enter full name'],
  ['phone', 'Phone', '01XXXXXXXXX'],
  ['email', 'Email', 'name@example.com'],
  ['nid', 'NID', 'National ID number'],
];

const COLUMNS = [
  ['Name', 'sm:col-span-3'],
  ['Phone', 'sm:col-span-2'],
  ['Email', 'sm:col-span-3'],
  ['Type', 'sm:col-span-2'],
  ['Agreement', 'sm:col-span-2'],
];

const accentOf = (type) =>
  type === 'First Party' ? { fg: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-600' } :
  type === 'Second Party' ? { fg: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' } :
  { fg: 'text-gray-400', bg: 'bg-gray-50', dot: 'bg-gray-300' };

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function PartyList() {
  const [parties, setParties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [brokenImages, setBrokenImages] = useState(() => new Set());
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchParties();
    api.get('/agreements').then((r) => setAgreements(r.data)).catch(() => {});
  }, []);

  function fetchParties() {
    setLoading(true);
    api.get('/party-list')
      .then((r) => setParties(r.data))
      .catch(() => setParties([]))
      .finally(() => setLoading(false));
  }

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  function openModal(party = null) {
    setEditingId(party?._id ?? null);
    setForm(party ? {
      name: party.name || '', phone: party.phone || '', email: party.email || '',
      nid: party.nid || '', position: party.position || '', address: party.address || '',
      agreementId: party.agreementId ? String(party.agreementId) : '',
      type: party.type || '', status: party.status || '', details: party.details || '', image: null,
    } : EMPTY_FORM);
    setImagePreview(imageUrl(party?.image) || null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setIsDragging(false);
  }

  function processImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select a valid image file.');
    if (file.size > 5 * 1024 * 1024) return alert('Image size must be less than 5MB.');
    set('image', file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    set('image', null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const dragHandlers = {
    onDragOver: (e) => { e.preventDefault(); setIsDragging(true); },
    onDragEnter: (e) => { e.preventDefault(); setIsDragging(true); },
    onDragLeave: (e) => { e.preventDefault(); setIsDragging(false); },
    onDrop: (e) => { e.preventDefault(); setIsDragging(false); processImage(e.dataTransfer.files?.[0]); },
  };

  async function handleSave() {
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== null && v !== '' && payload.append(k, v));
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingId) await api.put(`/party-list/${editingId}`, payload, config);
      else await api.post('/party-list', payload, config);
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
    return [p.name, p.phone, p.email, p.type].some((v) => (v || '').toLowerCase().includes(q));
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
      <div className="px-6 pt-6 pb-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-2">
              <Link to="/dashboard" className="hover:text-indigo-600">Home</Link>
              <span className="mx-1.5">/</span>
              <Link to="/dashboard" className="hover:text-indigo-600">Accounts Module</Link>
              <span className="mx-1.5">/</span>
              <span className="text-gray-700 font-medium">Party List</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Party List</h1>
            <p className="text-sm text-gray-500 mt-1">
              Everyone named on an agreement — buyers, contractors, witnesses, and more.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} /> New Party
          </button>
        </div>

        {/* Ledger strip */}
        <div className="flex items-stretch mb-6 rounded-xl overflow-hidden bg-white border border-gray-200">
          {[['Total parties', parties.length], ['Matching search', filtered.length], ['Showing', `${paged.length} of ${filtered.length}`]].map(([label, val], i) => (
            <div key={label} className={`flex-1 px-5 py-4 ${i > 0 ? 'border-l border-gray-200' : ''}`}>
              <p className="text-2xl font-bold text-gray-900">{val}</p>
              <p className="text-xs mt-0.5 text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              Columns <ChevronDown size={14} />
            </button>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search parties"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>

        {/* Registry list */}
        <div className="rounded-xl overflow-hidden bg-white border border-gray-200">
          {/* Column header row — hidden on mobile where rows already stack labels */}
          {!loading && filtered.length > 0 && (
            <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <span className="w-10 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-12 gap-x-4">
                {COLUMNS.map(([label, span]) => (
                  <span key={label} className={`text-xs font-semibold uppercase tracking-wide text-gray-400 ${span}`}>{label}</span>
                ))}
              </div>
              <span className="w-[68px] flex-shrink-0" />
            </div>
          )}

          {loading && <div className="px-5 py-14 text-center text-sm text-gray-400">Loading…</div>}

          {!loading && parties.length === 0 && (
            <div className="flex flex-col items-center text-center px-6 py-16">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-indigo-50 text-indigo-600">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">No parties yet</h3>
              <p className="text-sm max-w-xs mb-5 text-gray-500">
                Add the people or organizations tied to your agreements — they'll show up here.
              </p>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} /> Add your first party
              </button>
            </div>
          )}

          {!loading && parties.length > 0 && filtered.length === 0 && (
            <div className="px-5 py-14 text-center text-sm text-gray-400">
              No matches for "{search}"
            </div>
          )}

          {!loading && paged.map((party, idx) => {
            const accent = accentOf(party.type);
            const src = imageUrl(party.image);
            return (
              <div
                key={party._id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group ${idx > 0 ? 'border-t border-gray-50' : ''}`}
              >
                {src && !brokenImages.has(party._id) ? (
                  <img
                    src={src}
                    alt={party.name}
                    onError={() => setBrokenImages((prev) => new Set(prev).add(party._id))}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${accent.bg} ${accent.fg}`}>
                    {initials(party.name)}
                  </div>
                )}

                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-12 gap-x-4 gap-y-0.5 items-center">
                  <div className="sm:col-span-3 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{party.name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate sm:hidden">{party.phone || '—'}</p>
                  </div>
                  <p className="text-sm text-gray-600 truncate hidden sm:block sm:col-span-2">{party.phone || '—'}</p>
                  <p className="text-sm text-gray-600 truncate hidden sm:block sm:col-span-3">{party.email || '—'}</p>
                  <div className="hidden sm:flex sm:col-span-2 items-center gap-1.5">
                    {party.type && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />}
                    <span className="text-sm text-gray-700 truncate">{party.type || '—'}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate hidden sm:block sm:col-span-2">{party.agreementLabel || '—'}</p>
                </div>

                <div className="flex gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setViewing(party)}
                    title="View"
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openModal(party)}
                    title="Edit"
                    className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(party._id)}
                    title="Delete"
                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 flex-wrap gap-3">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
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
          )}
        </div>
      </div>

      {/* View (read-only) panel */}
      {viewing && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-start justify-center pt-8 sm:pt-14 z-[100000] overflow-y-auto">
          <div className="w-full max-w-lg mx-3 sm:mx-4 mb-10 rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Party details</h2>
              <button onClick={() => setViewing(null)} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                {imageUrl(viewing.image) ? (
                  <img src={imageUrl(viewing.image)} alt={viewing.name} className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold ${accentOf(viewing.type).bg} ${accentOf(viewing.type).fg}`}>
                    {initials(viewing.name)}
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">{viewing.name || '—'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${accentOf(viewing.type).dot}`} />
                    <span className="text-sm text-gray-500">{viewing.type || 'No type set'}</span>
                    {viewing.status && (
                      <span className={`ml-1 text-xs font-medium px-2 py-0.5 rounded-full ${viewing.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {viewing.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <DetailRow icon={Phone} label="Phone" value={viewing.phone} />
                <DetailRow icon={Mail} label="Email" value={viewing.email} />
                <DetailRow icon={IdCard} label="NID" value={viewing.nid} />
                <DetailRow icon={Briefcase} label="Position" value={viewing.position} />
                <DetailRow icon={MapPin} label="Address" value={viewing.address} full />
                <DetailRow icon={FileText} label="Agreement" value={viewing.agreementLabel} full />
              </div>

              {viewing.details && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 whitespace-pre-wrap">{viewing.details}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setViewing(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => { const p = viewing; setViewing(null); openModal(p); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-200"
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-start justify-center pt-8 sm:pt-14 z-[100000] overflow-y-auto">
          <div className="w-full max-w-3xl mx-3 sm:mx-4 mb-10 rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit party' : 'New party'}</h2>
                <p className="text-sm mt-0.5 text-gray-500">
                  {editingId ? 'Update this party\u2019s details' : 'Link a person or organization to an agreement'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row">
              {/* Identity column */}
              <div className="sm:w-56 flex-shrink-0 px-6 py-6 flex flex-col items-center text-center bg-gray-50 border-r border-gray-100">
                <div
                  {...dragHandlers}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-3 cursor-pointer overflow-hidden transition-colors border-2 border-dashed ${
                    isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={22} className="text-gray-300" />
                  )}
                </div>

                {imagePreview ? (
                  <div className="flex items-center gap-1 text-xs mb-2 text-green-600">
                    <CheckCircle2 size={13} /> Photo added
                  </div>
                ) : (
                  <p className="text-xs mb-2 text-gray-500">JPG, PNG or WEBP · 5MB max</p>
                )}

                <div className="flex gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Upload size={12} /> {imagePreview ? 'Change' : 'Upload'}
                  </button>
                  {imagePreview && (
                    <button type="button" onClick={removeImage} className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50">
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/jpg" onChange={(e) => processImage(e.target.files?.[0])} className="hidden" />

                <div className="w-full rounded-lg px-3 py-3 text-left bg-white border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">{form.name || 'Unnamed party'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accentOf(form.type).dot}`} />
                    <span className="text-xs text-gray-500">{form.type || 'No type set'}</span>
                  </div>
                </div>
              </div>

              {/* Fields column */}
              <div className="flex-1 px-6 py-6 max-h-[65vh] overflow-y-auto">
                <SectionLabel title="Basic information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {BASIC_FIELDS.map(([key, label, placeholder]) => (
                    <Field key={key} label={label}>
                      <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className="input" />
                    </Field>
                  ))}
                </div>

                <SectionLabel title="Role & agreement" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <Field label="Position">
                    <input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Managing Director" className="input" />
                  </Field>
                  <Field label="Address">
                    <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Enter address" className="input" />
                  </Field>
                  <Field label="Agreement">
                    <SearchableSelect options={agreementOptions} value={form.agreementId} onChange={(val) => set('agreementId', val)} placeholder="Select agreement" />
                  </Field>
                  <Field label="Type">
                    <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input">
                      <option value="">Select type</option>
                      {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
                      <option value="">Select status</option>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>

                <SectionLabel title="Notes" />
                <textarea
                  value={form.details}
                  onChange={(e) => set('details', e.target.value)}
                  rows={4}
                  placeholder="Anything else worth noting about this party…"
                  className="input resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-200 disabled:opacity-60 transition-all"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add party'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 10px; font-size: 13px; color: #374151; background: #fff; transition: all 0.15s ease; }
        .input::placeholder { color: #a1a1aa; }
        .input:hover { border-color: #d1d5db; }
        .input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.10); }
        select.input { cursor: pointer; }
      `}</style>
    </div>
  );
}

function SectionLabel({ title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1 h-1 rounded-full bg-indigo-600" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        <Icon size={12} /> {label}
      </p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}