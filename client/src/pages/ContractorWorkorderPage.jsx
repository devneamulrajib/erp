// client/src/pages/ContractorWorkorderPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getParties, createParty, getNextPartyCode } from '../api/party';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getCategories } from '../api/category';
import { getItems, createItem } from '../api/item';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import {
  getContractorWorkorder, getNextContractorWorkorderCode,
  createContractorWorkorder, updateContractorWorkorder,
} from '../api/contractorWorkorder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X, PlusCircle, UserPlus, ListChecks, Upload } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
// MySQL rows use `id`; some stale data/objects may still carry `_id`. Always prefer id.
function rid(o) {
  return o?.id ?? o?._id ?? '';
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const inputSmCls =
  "border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";

export default function ContractorWorkorderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [chartGroups, setChartGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [rows, setRows] = useState([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [aitIncluded, setAitIncluded] = useState(false);
  const [aitPercent, setAitPercent] = useState(0);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getParties({ type: 'contractor' }).then(setSuppliers).catch(() => {});
    getChartOfGroups().then((res) => setChartGroups(res.data || res)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
    getBrands().then((res) => setBrands(res.data || res)).catch(() => {});
    getUnits().then((res) => setUnits(res.data || res)).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {}).then((res) => setItems(res.data || res)).catch(() => {});
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextContractorWorkorderCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getContractorWorkorder(id).then((o) => {
      setDate(o.date || '');
      setSupplier(rid(o.supplier));
      setCode(o.code || '');
      setProjectType(rid(o.projectType) || o.projectType || '');
      setProject(rid(o.project));
      setSite(rid(o.site));
      setCategory(rid(o.category));
      setContentBody(o.contentBody || '');
      setRows(o.items || []);
      setVatIncluded(!!o.vatIncluded);
      setVatPercent(o.vatPercent || 0);
      setAitIncluded(!!o.aitIncluded);
      setAitPercent(o.aitPercent || 0);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load contractor work order.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [rows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const aitAmount = aitIncluded ? subtotal * (num(aitPercent) / 100) : 0;
  const grandTotal = subtotal + vatAmount + aitAmount;

  function addItemRow() {
    const it = items.find((x) => String(rid(x)) === String(selectedItemId));
    if (!it) return;
    setRows((prev) => [...prev, {
      item: rid(it),
      itemName: it.name,
      description: '',
      unit: it.unit,
      quantity: 0,
      rate: it.purchasePrice || 0,
      image: '',
      amount: 0,
    }]);
    setSelectedItemId('');
  }
  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supplier) {
      setError('Supplier is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, supplier, projectType, project, site, category, contentBody,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        attachment: attachmentName,
        vatIncluded, vatPercent, aitIncluded, aitPercent,
      };
      if (isEdit) {
        await updateContractorWorkorder(id, payload);
      } else {
        await createContractorWorkorder(payload);
      }
      navigate('/billing/contractor-work-order-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save work order');
    } finally {
      setSubmitting(false);
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
                { label: 'Billing', to: '/billing/contractor-work-order-list' },
                { label: 'Contractor Workorder' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Contractor Work Order' : 'New Contractor Work Order'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Create a work order and manage billing items</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowItemModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <PlusCircle size={16} strokeWidth={2.5} />
              Add Item
            </button>
            <button
              type="button"
              onClick={() => setShowPartyModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-cyan-600/20 transition-colors"
            >
              <UserPlus size={16} strokeWidth={2.5} />
              Contractor/Worker Add
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing/contractor-work-order-list')}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-orange-500/20 transition-colors"
            >
              <ListChecks size={16} strokeWidth={2.5} />
              Work Order List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* Details panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Supplier" required>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
                  <option value="">Select One Option</option>
                  {suppliers.map((s) => <option key={rid(s)} value={rid(s)}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono`} />
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
                  <option value="">Select value</option>
                  {projectTypes.map((pt) => <option key={rid(pt)} value={rid(pt)}>{pt.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={rid(p)} value={rid(p)}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={rid(s)} value={rid(s)}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Attachment">
                <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-500 cursor-pointer hover:bg-slate-50 transition">
                  <Upload size={14} className="text-slate-400" />
                  <span className="truncate">{attachmentName || 'Choose File'}</span>
                  <input type="file" className="hidden" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} />
                </label>
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={rid(c)} value={rid(c)}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Select Item">
                <div className="flex gap-2">
                  <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className={`${inputCls} flex-1`}>
                    <option value="">Select Item</option>
                    {items.map((it) => <option key={rid(it)} value={rid(it)}>{it.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={!selectedItemId}
                    className="w-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Content Body">
                <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={5} className={`${inputCls} w-full resize-none`} />
              </Field>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No items added</td></tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{r.itemName}</td>
                        <td className="px-4 py-2.5">
                          <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className={`${inputSmCls} w-40`} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.unit}</td>
                        <td className="px-4 py-2.5">
                          <input type="number" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className={`${inputSmCls} w-16`} />
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className={`${inputSmCls} w-20`} />
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="file" onChange={(e) => updateRow(i, 'image', e.target.files?.[0]?.name || '')} className="w-28 text-[10px] text-slate-500" />
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{(num(r.rate) * num(r.quantity)).toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => removeRow(i)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-xl ml-auto mb-6">
            <TotalsRow label="Subtotal :" value={subtotal.toLocaleString()} bg="bg-blue-50/60" />
            <TotalsRow
              label={<>Vat(%) : <span className="text-indigo-600 font-medium">If Include:</span>{' '}
                <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="accent-indigo-600" /></>}
              value={<input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={inputSmCls + ' w-full'} />}
            />
            <TotalsRow label="Vat(Amount) :" value={vatAmount.toLocaleString()} bg="bg-orange-50/60" />
            <TotalsRow
              label={<>AIT(%) : <span className="text-emerald-600 font-medium">If Include:</span>{' '}
                <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} className="accent-emerald-600" /></>}
              value={<input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className={inputSmCls + ' w-full'} />}
            />
            <TotalsRow label="AIT(Amount) :" value={aitAmount.toLocaleString()} bg="bg-green-50/60" />
            <TotalsRow label="Grand Total :" value={grandTotal.toLocaleString()} bg="bg-indigo-600 text-white font-semibold" />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      {showItemModal && (
        <ItemAddModal
          categories={categories}
          brands={brands}
          units={units}
          onBrandCreated={(b) => setBrands((prev) => [...prev, b])}
          onClose={() => setShowItemModal(false)}
          onCreated={() => setShowItemModal(false)}
        />
      )}
      {showPartyModal && (
        <PartyAddModal
          chartGroups={chartGroups}
          onClose={() => setShowPartyModal(false)}
          onCreated={(p) => { setSuppliers((prev) => [...prev, p]); setSupplier(rid(p)); setShowPartyModal(false); }}
        />
      )}
    </div>
  );
}

function TotalsRow({ label, value, bg = 'bg-white' }) {
  return (
    <div className={`grid grid-cols-2 items-center px-5 py-3 border-b border-slate-100 last:border-0 ${bg}`}>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

function ItemAddModal({ categories, brands, units, onBrandCreated, onClose, onCreated }) {
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [showBrandInput, setShowBrandInput] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAddBrand() {
    if (!newBrandName.trim()) return;
    try {
      const res = await createBrand({ name: newBrandName.trim() });
      const created = res.data || res;
      onBrandCreated(created);
      setBrand(rid(created));
      setNewBrandName('');
      setShowBrandInput(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add brand');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Item Name is required');
      return;
    }
    setSaving(true);
    try {
      await createItem({
        category: category || null,
        brand: brand || null,
        name: name.trim(),
        unit: unit || null,
        purchasePrice,
        salePrice,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Item" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">Select Category</option>
              {categories.map((c) => <option key={rid(c)} value={rid(c)}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <div className="flex gap-2">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputCls} flex-1`}>
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={rid(b)} value={rid(b)}>{b.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowBrandInput((s) => !s)} className="w-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                <Plus size={16} />
              </button>
            </div>
            {showBrandInput && (
              <div className="flex gap-2 mt-2">
                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="New brand name" className={`${inputCls} flex-1`} />
                <button type="button" onClick={handleAddBrand} className="px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">Add</button>
              </div>
            )}
          </Field>
          <Field label="Item Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name" className={inputCls} />
          </Field>
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
              <option value="">Select Unit</option>
              {units.map((u) => <option key={rid(u)} value={rid(u)}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase Price">
            <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Enter Purchase Price" className={inputCls} />
          </Field>
          <Field label="Sale Price">
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Sale Price" className={inputCls} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Close</button>
          <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PartyAddModal({ chartGroups, onClose, onCreated }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [chartGroup, setChartGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getNextPartyCode().then(setCode).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const created = await createParty({
        code, name: name.trim(), phone, address,
        openingBalance, creditLimit, dueDate,
        chartGroup: chartGroup || null,
        type: 'contractor',
      });
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Labour/Worker/Contractor" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Code">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Customer Code" className={inputCls} />
          </Field>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" className={inputCls} />
          </Field>
          <Field label="Phone/Mobile">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter Phone/Mobile" className={inputCls} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter Address" className={inputCls} />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Enter Opening Balance" className={inputCls} />
          </Field>
          <Field label="Credit Limit">
            <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Enter Credit Limit" className={inputCls} />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Under">
            <select value={chartGroup} onChange={(e) => setChartGroup(e.target.value)} className={inputCls}>
              <option value="">Select One Option</option>
              {chartGroups.map((g) => <option key={rid(g)} value={rid(g)}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Close</button>
          <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-5 tracking-tight">{title}</h2>
        {children}
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