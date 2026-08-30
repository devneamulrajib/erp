import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers } from '../api/customer';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import {
  getPurchase, getNextPurchaseCode, getItemStockQty,
  createPurchase, updatePurchase,
} from '../api/purchase';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2 } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalizes an API response into a plain array, regardless of whether the
// underlying api/*.js function returns the raw axios response ({ data: [...] })
// or already-unwrapped data ([...]). Falls back to [] so `.map()` never crashes.
function unwrap(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export default function PurchasePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  // "add" is used as the "new purchase" URL segment, not a real ID — don't treat it as one
  const isEdit = !!id && id !== 'add';

  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [ledger, setLedger] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const [rows, setRows] = useState([]);
  const [discount, setDiscount] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [payments, setPayments] = useState([]);
  const [ifCheque, setIfCheque] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [chequeReceiptNo, setChequeReceiptNo] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers()
      .then((res) => setSuppliers(unwrap(res)))
      .catch(() => setSuppliers([]));
    api.get('/projects')
      .then((res) => setProjects(unwrap(res)))
      .catch(() => setProjects([]));
    // NOTE: assumed route '/project-types' — update this one line if your
    // backend uses a different path (e.g. '/projectTypes').
    api.get('/project-types')
      .then((res) => setProjectTypes(unwrap(res)))
      .catch(() => setProjectTypes([]));
    api.get('/sites')
      .then((res) => setSites(unwrap(res)))
      .catch(() => setSites([]));
    getCategories()
      .then((res) => setCategories(unwrap(res)))
      .catch(() => setCategories([]));
    getChartOfAccounts()
      .then((res) => setLedgers(unwrap(res)))
      .catch(() => setLedgers([]));
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {})
      .then((res) => setItems(unwrap(res)))
      .catch(() => setItems([]));
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextPurchaseCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getPurchase(id).then((p) => {
      setDate(p.date || '');
      setSupplier(p.supplier?.id || p.supplierId || '');
      setLedger(p.ledger?.id || p.ledgerId || p.ledger || '');
      setCode(p.code || '');
      setProjectType(p.projectType?.id || p.projectTypeId || p.projectType || '');
      setProject(p.project?.id || p.projectId || '');
      setTitleOfWork(p.titleOfWork || '');
      setTask(p.task || '');
      setSite(p.site?.id || p.siteId || '');
      setCategory(p.category?.id || p.categoryId || '');
      setRows(unwrap(p.PurchaseItems || p.items));
      setDiscount(p.discount ?? '');
      setDeliveryCharge(p.deliveryCharge ?? '');
      setPaid(p.paid ?? '');
      setNote(p.note || '');
      setPayments(unwrap(p.PurchasePayments || p.payments));
    }).catch((err) => {
      console.error(err);
      setError('Failed to load purchase.');
    });
  }, [id, isEdit]);

  // Subtotal is DERIVED from the item rows below (Rate x Purchase Qty per row) —
  // it is intentionally read-only. It stays at 0 until at least one item row
  // exists (via "Select Item" + the "+" button) and has a Rate and Purchase Qty.
  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.purchaseQty), 0),
    [rows]
  );
  const grandTotal = subtotal - num(discount) + num(deliveryCharge);
  const dueAmount = grandTotal - num(paid);
  const paymentsTotal = payments.reduce((sum, p) => sum + num(p.amount), 0);

  async function addItemRow() {
    const it = items.find((x) => x.id === Number(selectedItemId) || x.id === selectedItemId);
    if (!it) return;
    let stockQty = 0;
    try { stockQty = await getItemStockQty(it.id); } catch { /* default 0 */ }
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
      stockQty,
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

  function addPayment() {
    if (num(paymentAmount) <= 0) return;
    setPayments((prev) => [...prev, {
      transactionId: 'TXN' + Math.floor(100000 + Math.random() * 900000),
      method: ifCheque ? 'Cheque' : 'Cash',
      chequeReceiptNo,
      amount: num(paymentAmount),
      date: paymentDate,
    }]);
    setPaymentAmount('');
    setChequeReceiptNo('');
  }
  function removePayment(i) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supplier || !ledger) {
      setError('Supplier and Ledger are required');
      return;
    }
    if (rows.length === 0) {
      setError('Add at least one item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, supplier, ledger, projectType, project, titleOfWork, task,
        site, category,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.purchaseQty) })),
        discount: num(discount),
        deliveryCharge: num(deliveryCharge),
        paid: num(paid),
        note,
        attachment: attachmentName,
        payments,
      };
      if (isEdit) {
        await updatePurchase(id, payload);
      } else {
        await createPurchase(payload);
      }
      navigate('/inventory-module/purchase-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Inventory', to: '/inventory-module/purchase-list' },
            { label: 'Purchase' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/inventory-module/purchase-list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Purchase List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Supplier" required>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input">
              <option value="">Select an option</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Ledger" required>
            <select value={ledger} onChange={(e) => setLedger(e.target.value)} className="input">
              <option value="">Select Ledger</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input">
              <option value="">Select Project Type</option>
              {projectTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Title/Name of Work">
            <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
          </Field>
          <Field label="If Task">
            <input value={task} onChange={(e) => setTask(e.target.value)} className="input" placeholder="Select Task" />
          </Field>
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Select Item">
            <div className="flex gap-2">
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="input flex-1">
                <option value="">Select Item</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>{it.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItemRow}
                disabled={!selectedItemId}
                className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
                title="Add this item to the table below"
              >
                <Plus size={16} />
              </button>
            </div>
            {items.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No items found for this category.</p>
            )}
          </Field>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Code', 'Item Name', 'Details', 'Unit', 'Quantity', 'Rate', 'Budget Qty',
                  'Purchase Qty', 'Stock Qty', 'Amount', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-4 text-gray-400">No items added — select an item above and click +</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">{r.itemCode}</td>
                    <td className="px-2 py-1.5">{r.itemName}</td>
                    <td className="px-2 py-1.5">
                      <input value={r.details} onChange={(e) => updateRow(i, 'details', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">{r.unit}</td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={r.budgetQty} onChange={(e) => updateRow(i, 'budgetQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" value={r.purchaseQty} onChange={(e) => updateRow(i, 'purchaseQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">{r.stockQty}</td>
                    <td className="px-2 py-1.5 font-medium">{(num(r.rate) * num(r.purchaseQty)).toLocaleString()}</td>
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

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Subtotal">
              <input
                value={subtotal.toLocaleString()}
                readOnly
                title="Auto-calculated as the sum of Rate x Purchase Qty across all item rows"
                className="input bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-calculated from item rows</p>
            </Field>
            <Field label="Discount">
              <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" placeholder="discount" />
            </Field>
            <Field label="Delivery/Labour">
              <input type="number" min="0" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} className="input" placeholder="delivery_charge" />
            </Field>
            <Field label="Grand Total">
              <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium cursor-not-allowed" />
            </Field>
            <Field label="Paid">
              <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="input" />
            </Field>
            <Field label="Due">
              <input value={dueAmount.toLocaleString()} readOnly className="input bg-gray-50 text-red-600 font-medium cursor-not-allowed" />
            </Field>
            <Field label="Note/Comments">
              <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-500 text-white">
                  {['Transaction ID', 'Payment Method', 'Cheque Receipt No', 'Amount', 'Date', 'Action'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400">No payments yet</td></tr>
                ) : (
                  payments.map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">{p.transactionId}</td>
                      <td className="px-2 py-1.5">{p.method}</td>
                      <td className="px-2 py-1.5">{p.chequeReceiptNo || '-'}</td>
                      <td className="px-2 py-1.5">{num(p.amount).toLocaleString()}</td>
                      <td className="px-2 py-1.5">{p.date}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removePayment(i)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {payments.length > 0 && (
                  <tr className="border-t border-gray-200 font-medium">
                    <td colSpan={3} className="px-2 py-1.5">Total</td>
                    <td className="px-2 py-1.5">{paymentsTotal.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label={<span>Payment Method <span className="text-red-500">*</span> <label className="ml-2 text-xs font-normal"><input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="mr-1" />If cheque</label></span>}>
                <input value={ifCheque ? 'Cheque' : 'Cash'} readOnly className="input bg-gray-50" />
              </Field>
              <Field label="Payment Date">
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
              </Field>
              <Field label="Cheque Receipt No">
                <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className="input" placeholder="Cheque Receipt No" disabled={!ifCheque} />
              </Field>
              <Field label="Amount" required>
                <input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input" />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={addPayment}
                className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-md"
              >
                Add Payment
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-6 py-2 rounded-md disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </form>
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