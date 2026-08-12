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
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
      setSupplier(o.supplier?._id || o.supplier || '');
      setCode(o.code || '');
      setProjectType(o.projectType || '');
      setProject(o.project?._id || o.project || '');
      setSite(o.site?._id || o.site || '');
      setCategory(o.category?._id || o.category || '');
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
    const it = items.find((x) => x._id === selectedItemId);
    if (!it) return;
    setRows((prev) => [...prev, {
      item: it._id,
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Billing', to: '/billing/contractor-work-order-list' },
            { label: 'Contractor Workorder' },
          ]}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowItemModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Add Item
          </button>
          <button type="button" onClick={() => setShowPartyModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            +Contractor/Worker Add
          </button>
          <button type="button" onClick={() => navigate('/billing/contractor-work-order-list')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Work Order List
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Supplier" required>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Project Type">
            <input value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input" placeholder="Select value" />
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Attachment">
            <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Select Item">
            <div className="flex gap-2">
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="input flex-1">
                <option value="">Select Item</option>
                {items.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
              </select>
              <button type="button" onClick={addItemRow} disabled={!selectedItemId} className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
                <Plus size={16} />
              </button>
            </div>
          </Field>
        </div>

        <Field label="Content Body">
          <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={5} className="input w-full" />
        </Field>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mt-4 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-gray-400">No items added</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">{r.itemName}</td>
                    <td className="px-2 py-1.5">
                      <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className="w-40 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">{r.unit}</td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-16 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="file" onChange={(e) => updateRow(i, 'image', e.target.files?.[0]?.name || '')} className="w-28 text-[10px]" />
                    </td>
                    <td className="px-2 py-1.5 font-medium">{(num(r.rate) * num(r.quantity)).toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden max-w-xl ml-auto">
          <TotalsRow label="Subtotal :" value={subtotal.toLocaleString()} bg="bg-blue-50" />
          <TotalsRow
            label={<>Vat(%) : <span className="text-indigo-600">If Include:</span>{' '}
              <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} /></>}
            value={<input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="input" />}
          />
          <TotalsRow label="Vat(Amount) :" value={vatAmount.toLocaleString()} bg="bg-orange-50" />
          <TotalsRow
            label={<>AIT(%) : <span className="text-emerald-600">If Include:</span>{' '}
              <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} /></>}
            value={<input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className="input" />}
          />
          <TotalsRow label="AIT(Amount) :" value={aitAmount.toLocaleString()} bg="bg-green-50" />
          <TotalsRow label="Grand Total :" value={grandTotal.toLocaleString()} bg="bg-emerald-500 text-white font-medium" />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>

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
          onCreated={(p) => { setSuppliers((prev) => [...prev, p]); setSupplier(p._id); setShowPartyModal(false); }}
        />
      )}
    </div>
  );
}

function TotalsRow({ label, value, bg = 'bg-white' }) {
  return (
    <div className={`grid grid-cols-2 items-center px-4 py-2 border-b border-gray-200 last:border-0 ${bg}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm">{value}</div>
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
      setBrand(created._id);
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
      await createItem({ category, brand, name: name.trim(), unit, purchasePrice, salePrice });
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
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <div className="flex gap-2">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="input flex-1">
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowBrandInput((s) => !s)} className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white">
                <Plus size={16} />
              </button>
            </div>
            {showBrandInput && (
              <div className="flex gap-2 mt-2">
                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="New brand name" className="input flex-1" />
                <button type="button" onClick={handleAddBrand} className="px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm">Add</button>
              </div>
            )}
          </Field>
          <Field label="Item Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name" className="input" />
          </Field>
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
              <option value="">Select Unit</option>
              {units.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase Price">
            <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Enter Purchase Price" className="input" />
          </Field>
          <Field label="Sale Price">
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Sale Price" className="input" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium">Close</button>
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
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
        openingBalance, creditLimit, dueDate, chartGroup, type: 'contractor',
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
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Code">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Customer Code" className="input" />
          </Field>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" className="input" />
          </Field>
          <Field label="Phone/Mobile">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter Phone/Mobile" className="input" />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter Address" className="input" />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Enter Opening Balance" className="input" />
          </Field>
          <Field label="Credit Limit">
            <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Enter Credit Limit" className="input" />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </Field>
          <Field label="Under">
            <select value={chartGroup} onChange={(e) => setChartGroup(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {chartGroups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium">Close</button>
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
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