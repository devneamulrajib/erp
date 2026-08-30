import { useState, useEffect, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Plus, X, Search, LayoutGrid, Home } from 'lucide-react';
import { getFlats, createFlat, updateFlat, deleteFlat } from '../api/flat';
import { getProjects } from '../api/project';
import { getSites } from '../api/site';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

const STATUS_OPTIONS = ['Available', 'Booked', 'Sold'];

const STATUS_STYLES = {
  Available: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  Booked: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  Sold: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
};

const EMPTY_FORM = {
  project: '', site: '', flatLandNo: '', size: '', price: '',
  bedroom: '', bathroom: '', unit: '', drawing: '', dining: '',
  kitchen: '', balcony: '', parking: '', parkingCost: '',
  utilityCharge: '', basement: '', facing: '', amenities: '',
  status: '',
};

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function Flat() {
  const [flats, setFlats] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [filterProject, setFilterProject] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadFlats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFlats({
        project: filterProject,
        site: filterSite,
        status: filterStatus,
      });
      setFlats(Array.isArray(data) ? data : data.flats || []);
    } catch (e) {
      setError(e.message || 'Failed to load flats');
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterSite, filterStatus]);

  useEffect(() => {
    loadFlats();
  }, [loadFlats]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [pData, sData] = await Promise.all([getProjects(), getSites()]);
        setProjects(Array.isArray(pData) ? pData : pData.projects || pData.data || []);
        setSites(Array.isArray(sData) ? sData : sData.sites || sData.data || []);
      } catch (e) {
        console.error('Failed to load project/site options:', e);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, filterProject, filterSite, filterStatus]);

  const filteredFlats = useMemo(() => {
    if (!search.trim()) return flats;
    const q = search.trim().toLowerCase();
    return flats.filter((f) =>
      [f.flatLandNo, f.customer, f.code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [flats, search]);

  const totalPages = Math.max(1, Math.ceil(filteredFlats.length / pageSize));
  const pagedFlats = filteredFlats.slice((page - 1) * pageSize, page * pageSize);

  const availableCount = flats.filter((f) => f.status === 'Available').length;
  const soldCount = flats.filter((f) => f.status === 'Sold').length;

  const subtotal = num(form.price) * num(form.size);
  const grandTotal = subtotal + num(form.parkingCost) + num(form.utilityCharge);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(flat) {
    setEditingId(flat.id);
    setForm({
      project: flat.project?.id || flat.project || '',
      site: flat.site?.id || flat.site || '',
      flatLandNo: flat.flatLandNo || '',
      size: flat.size ?? '',
      price: flat.price ?? '',
      bedroom: flat.bedroom ?? '',
      bathroom: flat.bathroom ?? '',
      unit: flat.unit || '',
      drawing: flat.drawing || '',
      dining: flat.dining || '',
      kitchen: flat.kitchen || '',
      balcony: flat.balcony || '',
      parking: flat.parking || '',
      parkingCost: flat.parkingCost ?? '',
      utilityCharge: flat.utilityCharge ?? '',
      basement: flat.basement || '',
      facing: flat.facing || '',
      amenities: flat.amenities || '',
      status: flat.status || '',
    });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.project || !form.status) {
      setFormError('Project and Status are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        size: num(form.size),
        price: num(form.price),
        bedroom: num(form.bedroom),
        bathroom: num(form.bathroom),
        parkingCost: num(form.parkingCost),
        utilityCharge: num(form.utilityCharge),
        subtotal,
        grandTotal,
      };
      if (editingId) {
        await updateFlat(editingId, payload);
      } else {
        await createFlat(payload);
      }
      closeModal();
      loadFlats();
    } catch (e) {
      setFormError(e.message || 'Failed to save flat');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this flat/land entry?')) return;
    try {
      await deleteFlat(id);
      loadFlats();
    } catch (e) {
      setError(e.message || 'Failed to delete');
    }
  }

  function projectName(f) {
    if (f.project && typeof f.project === 'object') return f.project.name;
    return projects.find((p) => p.id === f.project)?.name || '-';
  }
  function siteName(f) {
    if (f.site && typeof f.site === 'object') return f.site.name;
    return sites.find((s) => s.id === f.site)?.name || '-';
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Flat', to: '/inventory-module/flat' },
                { label: 'Flat' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Flats / Land</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage inventory units, pricing, and sale status</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Flat Add
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Units</div>
            <div className="text-xl font-semibold text-slate-900">{flats.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Available</div>
            <div className="text-xl font-semibold text-emerald-600">{availableCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Sold</div>
            <div className="text-xl font-semibold text-indigo-600">{soldCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredFlats.length}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className={inputClass}
              >
                <option value="">Select value</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Site</label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className={inputClass}
              >
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputClass}
              >
                <option value="">Select Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
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
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flats..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Project', 'Site', 'Flat/Land No', 'Unit', 'Bedroom', 'Bathroom', 'Size',
                    'Price', 'Subtotal', 'Parking Cost', 'Utility Charge', 'Grand Total', 'Customer', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={16} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pagedFlats.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedFlats.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{projectName(f)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{siteName(f)}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openEditModal(f)}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2"
                        >
                          <Home size={13} className="text-slate-400" />
                          {f.flatLandNo}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{f.unit}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.bedroom}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.bathroom}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.size}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.price}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.subtotal}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.parkingCost}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.utilityCharge}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{f.grandTotal}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.customer || '-'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[f.status] || 'bg-slate-50 text-slate-500 ring-slate-600/10'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(f)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
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
              Showing <span className="font-medium text-slate-700">{filteredFlats.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filteredFlats.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredFlats.length}</span> entries
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

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Flat' : 'New Flat'}</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formError && (
                  <div className="col-span-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {formError}
                  </div>
                )}

                <Field label="Project" required>
                  <select
                    value={form.project}
                    onChange={(e) => updateField('project', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select One Option</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Site">
                  <select
                    value={form.site}
                    onChange={(e) => updateField('site', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Flat No">
                  <input value={form.flatLandNo} onChange={(e) => updateField('flatLandNo', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Size">
                  <input type="number" value={form.size} onChange={(e) => updateField('size', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Price">
                  <input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Bedroom">
                  <input type="number" value={form.bedroom} onChange={(e) => updateField('bedroom', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Bathroom">
                  <input type="number" value={form.bathroom} onChange={(e) => updateField('bathroom', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Unit">
                  <input value={form.unit} onChange={(e) => updateField('unit', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Drawing">
                  <input value={form.drawing} onChange={(e) => updateField('drawing', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Dining">
                  <input value={form.dining} onChange={(e) => updateField('dining', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Kitchen">
                  <input value={form.kitchen} onChange={(e) => updateField('kitchen', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Balcony">
                  <input value={form.balcony} onChange={(e) => updateField('balcony', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Parking">
                  <input value={form.parking} onChange={(e) => updateField('parking', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Parking Cost">
                  <input type="number" value={form.parkingCost} onChange={(e) => updateField('parkingCost', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Utility Charge">
                  <input type="number" value={form.utilityCharge} onChange={(e) => updateField('utilityCharge', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Basement">
                  <input value={form.basement} onChange={(e) => updateField('basement', e.target.value)} className={inputClass} />
                </Field>

                <Field label="Facing">
                  <input value={form.facing} onChange={(e) => updateField('facing', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Amenities">
                  <textarea value={form.amenities} onChange={(e) => updateField('amenities', e.target.value)} className={`${inputClass} min-h-[42px]`} />
                </Field>

                <Field label="Status" required>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className={inputClass}>
                    <option value="">Select Sale Status</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <div className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-2">
                  <div className="text-sm text-slate-500">
                    Subtotal: <span className="font-semibold text-slate-900">{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    Grand Total: <span className="font-semibold text-slate-900">{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
                >
                  {saving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}