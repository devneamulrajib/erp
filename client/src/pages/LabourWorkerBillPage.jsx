import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getCategories } from '../api/category';
import { getItems, createItem } from '../api/item';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import {
  getLabourBill, getNextLabourBillCode,
  createLabourBill, updateLabourBill,
} from '../api/labourBill';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function LabourWorkerBillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState('');
  const [ledger, setLedger] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [site, setSite] = useState('');
  const [refWoNo, setRefWoNo] = useState('');
  const [task, setTask] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [rows, setRows] = useState([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [showItemModal, setShowItemModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getParties().then(setParties).catch(() => {});
    getChartOfAccounts().then((res) => setLedgers(res.data || res)).catch(() => {});
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
    getNextLabourBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getLabourBill(id).then((b) => {
      setDate(b.date || '');
      setParty(b.party?._id || b.party || '');
      setLedger(b.ledger?._id || b.ledger || '');
      setCode(b.code || '');
      setProjectType(b.projectType || '');
      setProject(b.project?._id || b.project || '');
      setTitleOfWork(b.titleOfWork || '');
      setSite(b.site?._id || b.site || '');
      setRefWoNo(b.refWoNo || '');
      setTask(b.task || '');
      setCategory(b.category?._id || b.category || '');
      setRows(b.items || []);
      setVatIncluded(!!b.vatIncluded);
      setVatPercent(b.vatPercent || 0);
      setPaymentMethod(b.paymentMethod || 'Cash');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load labour/worker bill.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.qtyDays), 0),
    [rows]
  );
  const totalQuantity = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.qtyDays), 0),
    [rows]
  );
  const totalSecurity = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.security), 0),
    [rows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const totalPayable = grandTotal - totalSecurity;

  function addItemRow() {
    const it = items.find((x) => x._id === selectedItemId);
    if (!it) return;
    setRows((prev) => [...prev, {
      item: it._id,
      itemName: it.name,
      description: '',
      unit: it.unit,
      qtyDays: 0,
      rate: it.purchasePrice || 0,
      security: 0,
      gross: 0,
      netPayable: 0,
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
    if (!party) {
      setError('Contractor is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, party, ledger, projectType, project, titleOfWork, task,
        site, category, refWoNo,
        items: rows.map((r) => {
          const gross = num(r.rate) * num(r.qtyDays);
          return { ...r, gross, netPayable: gross - num(r.security) };
        }),
        attachment: attachmentName,
        vatIncluded, vatPercent, paymentMethod,
      };
      if (isEdit) {
        await updateLabourBill(id, payload);
      } else {
        await createLabourBill(payload);
      }
      navigate('/service/labor-worker-bill-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save labour/worker bill');
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
            { label: 'Labour/Worker Bill', to: '/service/labor-worker-bill-list' },
            { label: 'Labour/Worker Bill Add' },
          ]}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowItemModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Item Add
          </button>
          <button type="button" onClick={() => navigate('/service/labor-worker-bill-list')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Labour/Worker Bill List
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Contractor" required>
            <select value={party} onChange={(e) => setParty(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {parties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Ledger">
            <select value={ledger} onChange={(e) => setLedger(e.target.value)} className="input">
              <option value="">Select Ledger</option>
              {ledgers.map((l) => <option key={l._id} value={l._id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
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
          <Field label="Title/Name of Work">
            <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
          </Field>
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Ref W/O No.">
            <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className="input" placeholder="PO No." />
          </Field>
          <Field label="If Task">
            <input value={task} onChange={(e) => setTask(e.target.value)} className="input" placeholder="Select Task" />
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

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Labour/Worker', 'Description', 'Unit', 'Qty/Days', 'Rate', 'Gross', 'Security', 'Net Payable', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-gray-400">No items added</td></tr>
              ) : (
                rows.map((r, i) => {
                  const gross = num(r.rate) * num(r.qtyDays);
                  const netPayable = gross - num(r.security);
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">{r.itemName}</td>
                      <td className="px-2 py-1.5">
                        <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className="w-40 border border-gray-200 rounded px-2 py-1" />
                      </td>
                      <td className="px-2 py-1.5">{r.unit}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={r.qtyDays} onChange={(e) => updateRow(i, 'qtyDays', e.target.value)} className="w-16 border border-gray-200 rounded px-2 py-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{gross.toLocaleString()}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={r.security} onChange={(e) => updateRow(i, 'security', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{netPayable.toLocaleString()}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Subtotal">
              <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="VAT(%)">
              <div className="flex items-center gap-2">
                <input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="input" />
                <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} /> Include
                </label>
              </div>
            </Field>
            <Field label="VAT Amount">
              <input value={vatAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Total Quantity">
              <input value={totalQuantity.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Grand Total">
              <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Total Security">
              <input value={totalSecurity.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Total Payable">
              <input value={totalPayable.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Payment Method">
              <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
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