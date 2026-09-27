import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers } from '../api/customer';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import {
  getPurchaseOrder, getNextPurchaseOrderCode,
  createPurchaseOrder, updatePurchaseOrder,
} from '../api/purchaseOrder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  Plus, Trash2, ListOrdered, ClipboardList, Paperclip,
  Truck, FileText, Wallet, CheckCircle2,
} from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';

function Badge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
    sky: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    rose: 'bg-rose-50 text-rose-600 ring-rose-600/10',
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tones[tone] || tones.slate}`}>
      {label}
    </span>
  );
}

function statusTone(status) {
  return status === 'Acknowledged' ? 'emerald' : 'sky';
}
function deliveryTone(status) {
  if (status === 'Delivered') return 'emerald';
  if (status === 'Shipped') return 'amber';
  return 'slate';
}
function paymentTone(status) {
  return status === 'Paid' ? 'emerald' : 'rose';
}

export default function PurchaseOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const [boqItemText, setBoqItemText] = useState('');
  const [boqItems, setBoqItems] = useState([]);
  const [rows, setRows] = useState([]);
  const [attachmentName, setAttachmentName] = useState('');

  // Lifecycle info — read-only, populated only when editing an existing order
  const [lifecycle, setLifecycle] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers()
      .then((res) => setSuppliers(asArray(res)))
      .catch(() => setSuppliers([]));
    api.get('/projects')
      .then((res) => setProjects(asArray(res)))
      .catch(() => setProjects([]));
    api.get('/project-types')
      .then((res) => setProjectTypes(asArray(res)))
      .catch(() => setProjectTypes([]));
    api.get('/sites')
      .then((res) => setSites(asArray(res)))
      .catch(() => setSites([]));
    getCategories()
      .then((res) => setCategories(asArray(res)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {})
      .then((res) => setItems(asArray(res)))
      .catch(() => setItems([]));
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextPurchaseOrderCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getPurchaseOrder(id).then((o) => {
      setDate(o.date || '');
      // Normalized to a string here — <select> values are always strings,
      // and o.supplierId / o.supplier?.id may come back as a number from
      // the API, which previously caused the dropdown to fail to match.
      const supplierId = o.supplier?.id ?? o.supplierId ?? o.supplier;
      setSupplier(supplierId != null ? String(supplierId) : '');
      setCode(o.code || '');
      setProjectType(o.projectType?.id || o.projectTypeId || o.projectType || '');
      setProject(o.project?.id || o.projectId || o.project || '');
      setTitleOfWork(o.titleOfWork || '');
      setTask(o.task || '');
      setSite(o.site?.id || o.siteId || o.site || '');
      setCategory(o.category?.id || o.categoryId || o.category || '');
      setBoqItems((o.boqItems || []).map((b) => (typeof b === 'string' ? b : b.label)));
      setRows(asArray(o.items));
      setLifecycle({
        status: o.status,
        deliveryStatus: o.deliveryStatus,
        deliveryConfirmedAt: o.deliveryConfirmedAt,
        paymentStatus: o.paymentStatus,
        supplierPaymentConfirmedAt: o.supplierPaymentConfirmedAt,
        invoiceFile: o.invoiceFile,
        convertedToBillId: o.convertedToBillId,
      });
    }).catch((err) => {
      console.error(err);
      setError('Failed to load purchase order.');
    });
  }, [id, isEdit]);

  function projectTypeName(pid) {
    if (!pid) return '-';
    return projectTypes.find((pt) => String(pt.id) === String(pid))?.name || pid;
  }

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.purchaseQty), 0),
    [rows]
  );

  function addBoqItem() {
    if (!boqItemText.trim()) return;
    setBoqItems((prev) => [...prev, boqItemText.trim()]);
    setBoqItemText('');
  }
  function removeBoqItem(i) {
    setBoqItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addItemRow() {
    const it = items.find((x) => String(x.id) === String(selectedItemId));
    if (!it) return;
    setRows((prev) => [...prev, {
      item: it.id,
      itemCode: it.code,
      itemName: it.name,
      details: '',
      unit: it.unit,
      quantity: '',
      rate: it.purchasePrice || '',
      budgetQty: '',
      purchaseQty: '',
      stockQty: 0,
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
    if (rows.length === 0) {
      setError('Add at least one item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, supplier, projectType, project, titleOfWork, task,
        site, category, boqItems,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.purchaseQty) })),
        attachment: attachmentName,
      };
      if (isEdit) {
        await updatePurchaseOrder(id, payload);
      } else {
        await createPurchaseOrder(payload);
      }
      navigate('/procurement-module/purchase-order-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
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
                { label: 'Inventory', to: '/procurement-module/purchase-order-list' },
                { label: isEdit ? 'Edit Purchase Order' : 'New Purchase Order' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? 'Update order details, items, and BOQ' : 'Create a new order and send it to a supplier'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/procurement-module/purchase-order-list')}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <ListOrdered size={15} /> Purchase Order List
          </button>
        </div>

        {/* Lifecycle strip — only shown when editing an existing order */}
        {isEdit && lifecycle && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge label={lifecycle.status || 'Submitted'} tone={statusTone(lifecycle.status)} />
              <Badge label={lifecycle.deliveryStatus || 'Pending'} tone={deliveryTone(lifecycle.deliveryStatus)} />
              <Badge label={lifecycle.paymentStatus || 'Unpaid'} tone={paymentTone(lifecycle.paymentStatus)} />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              {lifecycle.deliveryConfirmedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={13} className="text-emerald-500" />
                  Delivery confirmed {new Date(lifecycle.deliveryConfirmedAt).toLocaleDateString()}
                </span>
              )}
              {lifecycle.convertedToBillId && (
                <button
                  type="button"
                  onClick={() => navigate(`/billing/bill/${lifecycle.convertedToBillId}`)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <FileText size={13} /> View Invoice / Bill
                </button>
              )}
              {lifecycle.supplierPaymentConfirmedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Supplier confirmed payment receipt {new Date(lifecycle.supplierPaymentConfirmedAt).toLocaleDateString()}
                </span>
              )}
              {!lifecycle.convertedToBillId && (
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Wallet size={13} /> Invoice not generated yet
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
          )}

          {/* Main fields */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Supplier" required>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
                  <option value="">Select an option</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono`} />
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
                  <option value="">Select Project Type</option>
                  {projectTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title/Name of Work">
                <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className={inputCls} placeholder="Title/Name of Work" />
              </Field>
              <Field label="If Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} placeholder="Task" />
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Select Item">
                <div className="flex gap-2">
                  <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className={`${inputCls} flex-1`}>
                    <option value="">Select Item</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <button type="button" onClick={addItemRow} disabled={!selectedItemId}
                    className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No items found for this category.</p>
                )}
              </Field>
            </div>
          </div>

          {/* BOQ + Items */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <ClipboardList size={14} className="text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">BOQ Items</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={boqItemText}
                    onChange={(e) => setBoqItemText(e.target.value)}
                    placeholder="Add BOQ item"
                    className={`${inputCls} flex-1 text-xs py-2`}
                  />
                  <button type="button" onClick={addBoqItem}
                    className="px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                {boqItems.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-3">No BOQ items</div>
                ) : (
                  boqItems.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                      <span className="text-slate-700">{b}</span>
                      <button type="button" onClick={() => removeBoqItem(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Order Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                      {['Item Code', 'Item Name', 'Details', 'Unit', 'Quantity', 'Rate', 'Budget Qty',
                        'Purchase Qty', 'Stock Qty', 'Amount', 'Action'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr><td colSpan={11} className="text-center py-8 text-slate-400">No items added — select an item above and click +</td></tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-slate-600">{r.itemCode}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{r.itemName}</td>
                          <td className="px-3 py-2">
                            <input value={r.details} onChange={(e) => updateRow(i, 'details', e.target.value)}
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2 text-slate-600">{r.unit}</td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                              className="w-16 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)}
                              className="w-20 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={r.budgetQty} onChange={(e) => updateRow(i, 'budgetQty', e.target.value)}
                              className="w-16 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={r.purchaseQty} onChange={(e) => updateRow(i, 'purchaseQty', e.target.value)}
                              className="w-16 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2 text-slate-600">{r.stockQty}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{(num(r.rate) * num(r.purchaseQty)).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeRow(i)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals + Attachment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Subtotal">
                <input
                  value={subtotal.toLocaleString()}
                  readOnly
                  title="Auto-calculated as the sum of Rate x Purchase Qty across all item rows"
                  className={`${inputCls} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`}
                />
                <p className="text-xs text-slate-400 mt-1">Auto-calculated from item rows</p>
              </Field>
              <Field label="Grand Total">
                <input value={subtotal.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 font-bold text-slate-800 cursor-not-allowed`} />
              </Field>
              <Field label="Attachment">
                <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Order' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}