import { useEffect, useMemo, useRef, useState } from 'react';
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
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X, Package, ListChecks } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}
// IDs coming from MySQL/Sequelize are numbers; <select> values are always
// strings. Compare as strings everywhere we match an id picked from a
// dropdown against an id coming back from the API.
function sameId(a, b) {
  return a !== '' && a != null && b !== '' && b != null && String(a) === String(b);
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const inputReadOnlyCls = 'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-slate-50 text-slate-500';

export default function LabourWorkerBillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
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
  const qtyInputRefs = useRef([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [showItemModal, setShowItemModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [itemNotice, setItemNotice] = useState('');

  useEffect(() => {
    getParties().then((res) => setParties(asArray(res))).catch((err) => console.error('Failed to load parties', err));
    getChartOfAccounts().then((res) => setLedgers(asArray(res))).catch((err) => console.error('Failed to load ledgers', err));
    api.get('/projects').then((res) => setProjects(asArray(res))).catch((err) => console.error('Failed to load projects', err));
    api.get('/project-types').then((res) => setProjectTypes(asArray(res))).catch((err) => console.error('Failed to load project types', err));
    api.get('/sites').then((res) => setSites(asArray(res))).catch((err) => console.error('Failed to load sites', err));
    getCategories().then((res) => setCategories(asArray(res))).catch((err) => console.error('Failed to load categories', err));
    getBrands().then((res) => setBrands(asArray(res))).catch((err) => console.error('Failed to load brands', err));
    getUnits().then((res) => setUnits(asArray(res))).catch((err) => console.error('Failed to load units', err));
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {}).then((res) => setItems(asArray(res))).catch((err) => console.error('Failed to load items', err));
    setSelectedItemId('');
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextLabourBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getLabourBill(id).then((b) => {
      setDate(b.date || '');
      setParty(b.party?.id || b.party || '');
      setLedger(b.ledger?.id || b.ledger || '');
      setCode(b.code || '');
      setProjectType(b.projectType?.id || b.projectType || '');
      setProject(b.project?.id || b.project || '');
      setTitleOfWork(b.titleOfWork || '');
      setSite(b.site?.id || b.site || '');
      setRefWoNo(b.refWoNo || '');
      setTask(b.task || '');
      setCategory(b.category?.id || b.category || '');
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

  const selectedCategoryName = categories.find((c) => sameId(c.id, category))?.name;

  function addItemRow() {
    setItemNotice('');
    const it = items.find((x) => sameId(x.id, selectedItemId));
    if (!it) {
      setItemNotice('That item could not be found — please pick it again from the list.');
      return;
    }
    setRows((prev) => [...prev, {
      item: it.id,
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
  useEffect(() => {
    if (rows.length === 0) return;
    const lastInput = qtyInputRefs.current[rows.length - 1];
    if (lastInput) {
      lastInput.focus();
      lastInput.select();
    }
  }, [rows.length]);

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
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Labour/Worker Bill', to: '/service/labor-worker-bill-list' },
                { label: isEdit ? 'Edit' : 'Add' },
              ]}
            />
            <h1 className="text-xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Labour/Worker Bill' : 'New Labour/Worker Bill'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Record work items, security, and payment for a labourer or worker</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowItemModal(true)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={15} />
              Item Add
            </button>
            <button
              type="button"
              onClick={() => navigate('/service/labor-worker-bill-list')}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              Bill List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
          )}

          {/* Main details card — condensed into fewer, denser rows */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Contractor" required>
                <select value={party} onChange={(e) => setParty(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Ledger">
                <select value={ledger} onChange={(e) => setLedger(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputReadOnlyCls} font-mono`} />
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {projectTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title/Name of Work">
                <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className={inputCls} placeholder="Title of work" />
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Ref W/O No.">
                <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className={inputCls} placeholder="PO No." />
              </Field>
              <Field label="If Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} placeholder="Task" />
              </Field>
            </div>

            <div className="border-t border-slate-100 my-4" />

            <h2 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Package size={13} className="text-slate-400" /> Add Items
            </h2>
            <p className="text-[11px] text-slate-400 mb-3">Pick a category, choose an item, then click + to add it below.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Item</label>
                <div className="flex gap-2">
                  <select
                    value={selectedItemId}
                    onChange={(e) => { setSelectedItemId(e.target.value); setItemNotice(''); }}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="">{items.length === 0 ? 'No items available' : 'Select Item'}</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={!selectedItemId}
                    title={selectedItemId ? 'Add this item to the bill' : 'Select an item first'}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {items.length === 0
                    ? (category ? 'No items in this category yet — use "Item Add" above.' : 'No items yet — use "Item Add" above.')
                    : (category ? `Showing items in "${selectedCategoryName || 'this category'}"` : 'Showing all items')}
                </p>
                {itemNotice && <p className="text-[11px] text-red-500 mt-1">{itemNotice}</p>}
              </div>
            </div>
          </div>

          {/* Items table — tighter row height, smaller font, horizontal
              scroll on narrow screens rather than squeezing columns unreadably */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ListChecks size={13} className="text-slate-400" /> Bill Items
              </h3>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{rows.length} added</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    {['Labour/Worker', 'Description', 'Unit', 'Qty/Days', 'Rate', 'Gross', 'Security', 'Net Payable', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                        No items added yet — pick a category and item above, then click + to add it here.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => {
                      const gross = num(r.rate) * num(r.qtyDays);
                      const netPayable = gross - num(r.security);
                      return (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{r.itemName}</td>
                          <td className="px-3 py-2">
                            <input
                              value={r.description}
                              onChange={(e) => updateRow(i, 'description', e.target.value)}
                              placeholder="Optional note"
                              className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.unit}</td>
                          <td className="px-3 py-2">
                            <input
                              ref={(el) => (qtyInputRefs.current[i] = el)}
                              type="number"
                              min="0"
                              value={r.qtyDays}
                              onChange={(e) => updateRow(i, 'qtyDays', e.target.value)}
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={r.rate}
                              onChange={(e) => updateRow(i, 'rate', e.target.value)}
                              className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{gross.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={r.security}
                              onChange={(e) => updateRow(i, 'security', e.target.value)}
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{netPayable.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              title="Remove item"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals card — 4-across grid instead of the previous sprawl */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
            <h2 className="text-xs font-semibold text-slate-700 mb-3">Totals</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Subtotal">
                <input value={subtotal.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="VAT (%)">
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={inputCls} />
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 whitespace-nowrap">
                    <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="rounded border-slate-300" /> Inc.
                  </label>
                </div>
              </Field>
              <Field label="VAT Amount">
                <input value={vatAmount.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="Total Quantity">
                <input value={totalQuantity.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className={`${inputReadOnlyCls} font-semibold text-slate-900`} />
              </Field>
              <Field label="Total Security">
                <input value={totalSecurity.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="Total Payable">
                <input value={totalPayable.toLocaleString()} readOnly className={`${inputReadOnlyCls} font-semibold text-slate-900`} />
              </Field>
              <Field label="Payment Method">
                <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls} />
              </Field>
              <div className="col-span-2 sm:col-span-4">
                <Field label="Attachment">
                  <input
                    type="file"
                    onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white file:mr-3 file:px-2.5 file:py-1 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-medium hover:file:bg-slate-200 transition"
                  />
                  {attachmentName && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Selected: {attachmentName} — note: this file is not yet uploaded to the server (only its name is saved). Ask if you want this wired up properly.
                    </p>
                  )}
                </Field>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
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
      setBrand(created.id);
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
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <div className="flex gap-2">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`${inputCls} flex-1`}>
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowBrandInput((s) => !s)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
              >
                <Plus size={15} />
              </button>
            </div>
            {showBrandInput && (
              <div className="flex gap-2 mt-2">
                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="New brand name" className={`${inputCls} flex-1`} />
                <button type="button" onClick={handleAddBrand} className="px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">Add</button>
              </div>
            )}
          </Field>
          <Field label="Item Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name" className={inputCls} />
          </Field>
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
              <option value="">Select Unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase Price">
            <input type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Enter Purchase Price" className={inputCls} />
          </Field>
          <Field label="Sale Price">
            <input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Sale Price" className={inputCls} />
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}