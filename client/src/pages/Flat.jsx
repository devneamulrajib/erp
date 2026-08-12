import { useState, useEffect, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { getFlats, createFlat, updateFlat, deleteFlat } from '../api/flat';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';

const STATUS_OPTIONS = ['Available', 'Booked', 'Sold'];

const EMPTY_FORM = {
  project: '', site: '', flatLandNo: '', size: '', price: '',
  bedroom: '', bathroom: '', unit: '', drawing: '', dining: '',
  kitchen: '', balcony: '', parking: '', parkingCost: '',
  utilityCharge: '', basement: '', facing: '', amenities: '',
  status: '',
};

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
    // Load project/site dropdown options. Adjust these fetches to match
    // your real project.js / site.js api files if they differ.
    async function loadOptions() {
      const token = localStorage.getItem('token');
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      try {
        const [pRes, sRes] = await Promise.all([
          fetch('/api/projects', { headers }),
          fetch('/api/sites', { headers }),
        ]);
        const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
        setProjects(Array.isArray(pData) ? pData : pData.projects || []);
        setSites(Array.isArray(sData) ? sData : sData.sites || []);
      } catch {
        // Non-fatal — dropdowns just stay empty if this fails
      }
    }
    loadOptions();
  }, []);

  const filteredFlats = useMemo(() => {
    if (!search.trim()) return flats;
    const q = search.trim().toLowerCase();
    return flats.filter((f) =>
      [f.flatLandNo, f.customer, f.code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [flats, search]);

  const subtotal = num(form.price) * num(form.size);
  const grandTotal = subtotal + num(form.parkingCost) + num(form.utilityCharge);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(flat) {
    setEditingId(flat._id);
    setForm({
      project: flat.project?._id || flat.project || '',
      site: flat.site?._id || flat.site || '',
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
    return projects.find((p) => p._id === f.project)?.name || '-';
  }
  function siteName(f) {
    if (f.site && typeof f.site === 'object') return f.site.name;
    return sites.find((s) => s._id === f.site)?.name || '-';
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            <span>Home</span> <span className="mx-1">›</span>
            <span>Flat</span> <span className="mx-1">›</span>
            <span className="text-gray-700 font-medium">Flat</span>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            <Plus size={16} /> Flat Add
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select value</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Site</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end mb-2">
          <label className="text-sm text-gray-600 mr-2">Search:</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56"
          />
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white text-left">
                <th className="px-3 py-2 whitespace-nowrap">SL</th>
                <th className="px-3 py-2 whitespace-nowrap">Project</th>
                <th className="px-3 py-2 whitespace-nowrap">Site</th>
                <th className="px-3 py-2 whitespace-nowrap">Flat/Land No</th>
                <th className="px-3 py-2 whitespace-nowrap">Unit</th>
                <th className="px-3 py-2 whitespace-nowrap">Bedroom</th>
                <th className="px-3 py-2 whitespace-nowrap">Bathroom</th>
                <th className="px-3 py-2 whitespace-nowrap">Size</th>
                <th className="px-3 py-2 whitespace-nowrap">Price</th>
                <th className="px-3 py-2 whitespace-nowrap">Subtotal</th>
                <th className="px-3 py-2 whitespace-nowrap">Parking Cost</th>
                <th className="px-3 py-2 whitespace-nowrap">Utility Charge</th>
                <th className="px-3 py-2 whitespace-nowrap">Grand Total</th>
                <th className="px-3 py-2 whitespace-nowrap">Customer</th>
                <th className="px-3 py-2 whitespace-nowrap">Status</th>
                <th className="px-3 py-2 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} className="text-center py-6 text-gray-400">Loading…</td></tr>
              ) : filteredFlats.length === 0 ? (
                <tr><td colSpan={16} className="text-center py-6 text-gray-400">No entries found</td></tr>
              ) : (
                filteredFlats.map((f, idx) => (
                  <tr key={f._id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{projectName(f)}</td>
                    <td className="px-3 py-2">{siteName(f)}</td>
                    <td className="px-3 py-2 text-indigo-600">{f.flatLandNo}</td>
                    <td className="px-3 py-2">{f.unit}</td>
                    <td className="px-3 py-2">{f.bedroom}</td>
                    <td className="px-3 py-2">{f.bathroom}</td>
                    <td className="px-3 py-2">{f.size}</td>
                    <td className="px-3 py-2">{f.price}</td>
                    <td className="px-3 py-2">{f.subtotal}</td>
                    <td className="px-3 py-2">{f.parkingCost}</td>
                    <td className="px-3 py-2">{f.utilityCharge}</td>
                    <td className="px-3 py-2">{f.grandTotal}</td>
                    <td className="px-3 py-2">{f.customer || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-white text-xs font-medium ${
                        f.status === 'Sold' ? 'bg-indigo-500'
                        : f.status === 'Booked' ? 'bg-amber-500'
                        : 'bg-red-500'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(f)}
                          className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(f._id)}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded"
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

        {modalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Flat</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                {formError && (
                  <div className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {formError}
                  </div>
                )}

                <Field label="Project" required>
                  <select
                    value={form.project}
                    onChange={(e) => updateField('project', e.target.value)}
                    className="input"
                  >
                    <option value="">Select One Option</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Site">
                  <select
                    value={form.site}
                    onChange={(e) => updateField('site', e.target.value)}
                    className="input"
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Flat No">
                  <input value={form.flatLandNo} onChange={(e) => updateField('flatLandNo', e.target.value)} className="input" />
                </Field>
                <Field label="Size">
                  <input type="number" value={form.size} onChange={(e) => updateField('size', e.target.value)} className="input" />
                </Field>

                <Field label="Price">
                  <input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="input" />
                </Field>
                <Field label="Bedroom">
                  <input type="number" value={form.bedroom} onChange={(e) => updateField('bedroom', e.target.value)} className="input" />
                </Field>

                <Field label="Bathroom">
                  <input type="number" value={form.bathroom} onChange={(e) => updateField('bathroom', e.target.value)} className="input" />
                </Field>
                <Field label="Unit">
                  <input value={form.unit} onChange={(e) => updateField('unit', e.target.value)} className="input" />
                </Field>

                <Field label="Drawing">
                  <input value={form.drawing} onChange={(e) => updateField('drawing', e.target.value)} className="input" />
                </Field>
                <Field label="Dining">
                  <input value={form.dining} onChange={(e) => updateField('dining', e.target.value)} className="input" />
                </Field>

                <Field label="Kitchen">
                  <input value={form.kitchen} onChange={(e) => updateField('kitchen', e.target.value)} className="input" />
                </Field>
                <Field label="Balcony">
                  <input value={form.balcony} onChange={(e) => updateField('balcony', e.target.value)} className="input" />
                </Field>

                <Field label="Parking">
                  <input value={form.parking} onChange={(e) => updateField('parking', e.target.value)} className="input" />
                </Field>
                <Field label="Parking Cost">
                  <input type="number" value={form.parkingCost} onChange={(e) => updateField('parkingCost', e.target.value)} className="input" />
                </Field>

                <Field label="Utility Charge">
                  <input type="number" value={form.utilityCharge} onChange={(e) => updateField('utilityCharge', e.target.value)} className="input" />
                </Field>
                <Field label="Basement">
                  <input value={form.basement} onChange={(e) => updateField('basement', e.target.value)} className="input" />
                </Field>

                <Field label="Facing">
                  <input value={form.facing} onChange={(e) => updateField('facing', e.target.value)} className="input" />
                </Field>
                <Field label="Amenities">
                  <textarea value={form.amenities} onChange={(e) => updateField('amenities', e.target.value)} className="input min-h-[42px]" />
                </Field>

                <Field label="Status" required>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="input">
                    <option value="">Select Sale Status</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-2">
                  <div className="text-sm text-gray-500">
                    Subtotal: <span className="font-medium text-gray-800">{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Grand Total: <span className="font-medium text-gray-800">{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={closeModal} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">
                  Close
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60"
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
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}