import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getContacts } from '../api/contactAccounts';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import {
  getPurchase, getNextPurchaseCode, getItemStockQty,
  createPurchase, updatePurchase,
} from '../api/purchase';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  Plus, Trash2, ShoppingCart, List, Truck, Package, Wallet, Receipt, Save, ChevronDown,
} from 'lucide-react';
import { Panel } from '../components/dashboard/DashboardKit';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function unwrap(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export default function PurchasePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'add';

  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [ledger, setLedger] = useState('');
  const [code, setCode] = useState('');
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

  // Rarely used fields stay folded away until needed
  const [moreOpen, setMoreOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Suppliers are Supplier contacts in Chart of Accounts (purchases.supplierId
    // belongs to ChartOfAccount), not rows from the Customers table.
    getContacts('Supplier')
      .then((res) => setSuppliers(unwrap(res?.data ?? res)))
      .catch(() => setSuppliers([]));
    api.get('/projects')
      .then((res) => setProjects(unwrap(res)))
      .catch(() => setProjects([]));
    api.get('/sites')
      .then((res) => setSites(unwrap(res)))
      .catch(() => setSites([]));
    getCategories()
      .then((res) => setCategories(unwrap(res)))
      .catch(() => setCategories([]));
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
      setProject(p.project?.id || p.projectId || '');
      setTitleOfWork(p.titleOfWork || '');
      setTask(p.task || '');
      setSite(p.site?.id || p.siteId || '');
      setCategory(p.category?.id || p.categoryId || '');
      // Saved rows come back with itemId; the payload uses `item` (server maps
      // item -> itemId), so keep it set or editing would drop the item link.
      // One Qty on screen: purchaseQty drives stock and amount; fall back to the
      // old Quantity column for rows that only had that filled in.
      setRows(unwrap(p.PurchaseItems || p.items).map((r) => ({
        ...r, item: r.item ?? r.itemId, purchaseQty: num(r.purchaseQty) || r.quantity || '',
      })));
      setDiscount(p.discount ?? '');
      setDeliveryCharge(p.deliveryCharge ?? '');
      setPaid(p.paid ?? '');
      setNote(p.note || '');
      setPayments(unwrap(p.PurchasePayments || p.payments));
      if (p.projectId || p.titleOfWork || p.task || p.siteId) setMoreOpen(true);
      if (unwrap(p.PurchasePayments || p.payments).length) setPaymentsOpen(true);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load purchase.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.purchaseQty), 0),
    [rows]
  );
  const grandTotal = subtotal - num(discount) + num(deliveryCharge);
  const dueAmount = grandTotal - num(paid);
  const paymentsTotal = payments.reduce((sum, p) => sum + num(p.amount), 0);
  const moreFilled = [project, titleOfWork, task, site].filter(Boolean).length;

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

  // The single Qty box fills both quantity and purchaseQty (server uses
  // purchaseQty for stock and amount, quantity is kept in step).
  function updateQty(i, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, quantity: value, purchaseQty: value } : r)));
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
        // Ledger is no longer asked for on this page. The server still expects
        // one, so an edited purchase keeps its saved ledger and a new one gets
        // the model's default ('Closing Stock'). Ledger isn't used for vouchers.
        code, date, supplier, ledger: ledger || 'Closing Stock', project, titleOfWork, task,
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

  const inputSm = 'w-full min-w-[70px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
  const money = (v) => num(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Inventory', to: '/inventory-module/purchase-list' },
                { label: 'Purchase' },
              ]}
            />
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/30">
                <ShoppingCart size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {isEdit ? 'Edit Purchase' : 'New Purchase'}
              </h1>
              {code && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">{code}</span>
              )}
            </div>
            <p className="ml-12 mt-1 text-sm text-slate-500">Pick the supplier, add the items, check the total and save.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/inventory-module/purchase-list')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <List size={15} />
            Purchase List
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pb-10">
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              {/* 1. Supplier & date */}
              <Panel icon={Truck} title="Supplier & date" subtitle="Who you bought from" accent="indigo">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Date">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                  </Field>
                  <Field label="Supplier" required>
                    <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input">
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Code">
                    <input value={code} readOnly className="input font-mono" />
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <ChevronDown size={15} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                  More options (project, work, task, site)
                  {!moreOpen && moreFilled > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">{moreFilled} filled</span>
                  )}
                </button>
                {moreOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Project">
                      <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                        <option value="">Select project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Title/Name of Work">
                      <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Title/Name of Work" />
                    </Field>
                    <Field label="If Task">
                      <input value={task} onChange={(e) => setTask(e.target.value)} className="input" placeholder="Task" />
                    </Field>
                    <Field label="Site">
                      <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                        <option value="">Select site</option>
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </Panel>

              {/* 2. Items */}
              <Panel
                icon={Package}
                title="Items"
                subtitle="Choose an item and press Add, then enter Qty and Rate"
                accent="emerald"
                right={<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{rows.length} item{rows.length === 1 ? '' : 's'}</span>}
                bodyClassName="p-0"
              >
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end">
                  <Field label="Category (filter)">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Item">
                    <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="input">
                      <option value="">Select item</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name}{it.code ? ` (${it.code})` : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={!selectedItemId}
                    className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    title="Add this item to the table below"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Add
                  </button>
                  {items.length === 0 && (
                    <p className="text-xs text-slate-400 sm:col-span-3">No items found for this category.</p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="whitespace-nowrap bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        {['Item', 'Unit', 'Qty', 'Rate', 'Amount', ''].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                            No items yet. Select an item above and press <span className="font-medium text-indigo-600">Add</span>.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="align-middle hover:bg-slate-50/60">
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800">{r.itemName}</div>
                              <div className="font-mono text-[11px] text-slate-400">{r.itemCode}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{r.unit}</td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" value={r.purchaseQty} onChange={(e) => updateQty(i, e.target.value)} className={`${inputSm} max-w-[120px] border-indigo-200 bg-indigo-50/40`} placeholder="0" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className={`${inputSm} max-w-[140px] border-indigo-200 bg-indigo-50/40`} />
                            </td>
                            <td className="px-3 py-2 font-semibold tabular-nums text-slate-900">{money(num(r.rate) * num(r.purchaseQty))}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeRow(i)} title="Remove" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {rows.length > 0 && (
                  <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Amount = Qty × Rate</p>
                )}
              </Panel>

              {/* 3. Payment & notes */}
              <Panel icon={Wallet} title="Payment & notes" accent="violet">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Discount">
                    <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" placeholder="0" />
                  </Field>
                  <Field label="Delivery/Labour">
                    <input type="number" min="0" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} className="input" placeholder="0" />
                  </Field>
                  <Field label="Paid">
                    <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="input" placeholder="0" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Note/Comments">
                      <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Optional" />
                    </Field>
                  </div>
                  <Field label="Attachment">
                    <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input py-2 text-xs" />
                  </Field>
                </div>

                {/* Payment records */}
                <button
                  type="button"
                  onClick={() => setPaymentsOpen((o) => !o)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <ChevronDown size={15} className={`transition-transform ${paymentsOpen ? 'rotate-180' : ''}`} />
                  Payment records (cash / cheque)
                  {payments.length > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">{payments.length} · {money(paymentsTotal)}</span>
                  )}
                </button>
                {paymentsOpen && (
                  <div className="mt-3 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1fr_auto] xl:items-end">
                      <Field label="Payment Method" required>
                        <div className="flex h-[42px] items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                          {['Cash', 'Cheque'].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setIfCheque(m === 'Cheque')}
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                (m === 'Cheque') === ifCheque ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
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
                      <button
                        type="button"
                        onClick={addPayment}
                        className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        Add Payment
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="whitespace-nowrap bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            {['Transaction ID', 'Method', 'Cheque Receipt No', 'Amount', 'Date', ''].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.length === 0 ? (
                            <tr><td colSpan={6} className="py-5 text-center text-sm text-slate-400">No payments yet</td></tr>
                          ) : (
                            payments.map((p, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-mono text-xs">{p.transactionId}</td>
                                <td className="px-3 py-2">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.method === 'Cheque' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{p.method}</span>
                                </td>
                                <td className="px-3 py-2">{p.chequeReceiptNo || '-'}</td>
                                <td className="px-3 py-2 tabular-nums">{num(p.amount).toLocaleString()}</td>
                                <td className="px-3 py-2">{p.date}</td>
                                <td className="px-3 py-2">
                                  <button type="button" onClick={() => removePayment(i)} title="Remove" className="text-slate-400 hover:text-red-600">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                          {payments.length > 0 && (
                            <tr className="bg-slate-50 font-semibold">
                              <td colSpan={3} className="px-3 py-2">Total</td>
                              <td className="px-3 py-2 tabular-nums">{paymentsTotal.toLocaleString()}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            {/* Sticky summary */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,.05)]">
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Receipt className="size-4" />
                  </span>
                  <h2 className="text-sm font-bold text-slate-800">Summary</h2>
                </div>
                <dl className="space-y-2.5 px-5 py-4 text-sm">
                  <SummaryRow label="Items" value={rows.length} />
                  <SummaryRow
                    label="Subtotal"
                    value={money(subtotal)}
                    title="Auto-calculated as the sum of Rate x Purchase Qty across all item rows"
                  />
                  <SummaryRow label="Discount" value={`- ${money(discount)}`} />
                  <SummaryRow label="Delivery/Labour" value={`+ ${money(deliveryCharge)}`} />
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-800">Grand Total</dt>
                    <dd className="text-xl font-extrabold tabular-nums text-slate-900">{money(grandTotal)}</dd>
                  </div>
                  <SummaryRow label="Paid" value={money(paid)} valueClass="text-emerald-600" />
                  <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <dt className="font-medium text-red-700">Due</dt>
                    <dd className="font-bold tabular-nums text-red-600">{money(dueAmount)}</dd>
                  </div>
                </dl>
                <div className="space-y-2 border-t border-slate-100 px-5 py-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Purchase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/inventory-module/purchase-list')}
                    className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <p className="text-center text-[11px] text-slate-400">Supplier and at least one item are required.</p>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, title, valueClass = 'text-slate-800' }) {
  return (
    <div className="flex items-center justify-between" title={title}>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
