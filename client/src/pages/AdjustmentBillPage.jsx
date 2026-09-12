// client/src/pages/AdjustmentBillPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getCategories } from '../api/category';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import { createItem } from '../api/item';
import {
  getAdjustmentBill, getNextAdjustmentBillCode,
  createAdjustmentBill, updateAdjustmentBill,
} from '../api/adjustmentBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X, PackagePlus, UserPlus, ListChecks, Upload } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function genTxnId() {
  return 'TXN' + Math.floor(100000 + Math.random() * 900000);
}
function emptyRow() {
  return { itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0 };
}
// MySQL rows use `id`; fall back to `_id` only if present. Never falls back to name/text.
function rid(o) {
  return o?.id ?? o?._id ?? '';
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const inputSmCls =
  "border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";

export default function AdjustmentBillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [chartGroups, setChartGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [ledger, setLedger] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [site, setSite] = useState('');
  const [refWoNo, setRefWoNo] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [proposedRows, setProposedRows] = useState([]);
  const [adjustmentRows, setAdjustmentRows] = useState([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [aitIncluded, setAitIncluded] = useState(false);
  const [aitPercent, setAitPercent] = useState(0);
  const [interestRate, setInterestRate] = useState(0);

  const [payments, setPayments] = useState([]);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payIsCheque, setPayIsCheque] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payAmount, setPayAmount] = useState(0);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Customers live in the Chart Of Accounts table (contactType: 'Customer'),
    // same table backing the Customer Accounts page — not the old Customer model.
    api.get('/chart-of-accounts', { params: { contactType: 'Customer' } })
      .then((res) => setCustomers(res.data))
      .catch(() => {});
    getChartOfAccounts().then((res) => setLedgers(res.data || res)).catch(() => {});
    getChartOfGroups().then((res) => setChartGroups(res.data || res)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
    getBrands().then((res) => setBrands(res.data || res)).catch(() => {});
    getUnits().then((res) => setUnits(res.data || res)).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextAdjustmentBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getAdjustmentBill(id).then((b) => {
      setDate(b.date || '');
      setCustomer(rid(b.customer));
      setLedger(rid(b.ledger));
      setCode(b.code || '');
      setProjectType(rid(b.projectType) || b.projectType || '');
      setProject(rid(b.project));
      setSite(rid(b.site));
      setRefWoNo(b.refWoNo || '');
      setContentBody(b.contentBody || '');
      setProposedRows(b.proposedItems || []);
      setAdjustmentRows(b.adjustmentItems || []);
      setVatIncluded(!!b.vatIncluded);
      setVatPercent(b.vatPercent || 0);
      setAitIncluded(!!b.aitIncluded);
      setAitPercent(b.aitPercent || 0);
      setInterestRate(b.interestRate || 0);
      setPayments(b.payments || []);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load adjustment bill.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => adjustmentRows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [adjustmentRows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const aitAmount = aitIncluded ? subtotal * (num(aitPercent) / 100) : 0;
  const interestAmount = subtotal * (num(interestRate) / 100);
  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;
  const paid = useMemo(() => payments.reduce((s, p) => s + num(p.amount), 0), [payments]);
  const due = grandTotal - paid;

  function addProposedRow() { setProposedRows((prev) => [...prev, emptyRow()]); }
  function updateProposedRow(i, key, value) {
    setProposedRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeProposedRow(i) { setProposedRows((prev) => prev.filter((_, idx) => idx !== i)); }

  function addAdjustmentRow() { setAdjustmentRows((prev) => [...prev, emptyRow()]); }
  function updateAdjustmentRow(i, key, value) {
    setAdjustmentRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeAdjustmentRow(i) { setAdjustmentRows((prev) => prev.filter((_, idx) => idx !== i)); }

  function addPayment() {
    if (num(payAmount) <= 0) return;
    setPayments((prev) => [...prev, {
      transactionId: genTxnId(),
      paymentMethod: payMethod,
      isCheque: payIsCheque,
      chequeReceiptNo: payChequeNo,
      amount: num(payAmount),
      date: payDate,
    }]);
    setPayChequeNo('');
    setPayAmount(0);
  }
  function removePayment(i) { setPayments((prev) => prev.filter((_, idx) => idx !== i)); }

  async function fetchFromWorkorder() {
    if (!refWoNo.trim()) {
      setError('Enter a Ref W/O No. first');
      return;
    }
    setError('');
    try {
      // Work orders aren't looked up by id here, only by their code, so pull the
      // list (scoped to the selected customer when we have one) and match client-side.
      const res = await api.get('/workorder', { params: customer ? { customer } : {} });
      const match = (res.data || []).find((wo) => wo.code === refWoNo.trim());
      if (!match) {
        setError(`No work order found with code "${refWoNo.trim()}"`);
        return;
      }
      const items = (match.items || []).map((it) => ({
        itemName: it.itemName || '',
        description: it.description || '',
        unit: it.unit || '',
        quantity: it.quantity || 0,
        rate: it.rate || 0,
        image: it.image || '',
        amount: it.amount || 0,
      }));
      setProposedRows(items);
      // Adjustment Budget starts as a copy of the same items — you're adjusting
      // from this baseline, not typing it all in again from scratch.
      setAdjustmentRows(items.map((it) => ({ ...it })));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch work order');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customer) {
      setError('Customer is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, customer, ledger: ledger || null, projectType: projectType || null,
        project: project || null, site: site || null, refWoNo, contentBody,
        proposedItems: proposedRows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        adjustmentItems: adjustmentRows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        attachment: attachmentName,
        vatIncluded, vatPercent, aitIncluded, aitPercent, interestRate,
        payments,
      };
      if (isEdit) {
        await updateAdjustmentBill(id, payload);
      } else {
        await createAdjustmentBill(payload);
      }
      navigate('/billing/adjustment_bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save adjustment bill');
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
                { label: 'Billing', to: '/billing/adjustment_bill_list' },
                { label: 'Invoice/Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Adjustment Bill' : 'New Adjustment Bill'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Compare proposed vs adjusted budget and record payments</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowItemModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <PackagePlus size={16} strokeWidth={2.5} />
              Item Add
            </button>
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-cyan-600/20 transition-colors"
            >
              <UserPlus size={16} strokeWidth={2.5} />
              Contacts Add
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing/adjustment_bill_list')}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-orange-500/20 transition-colors"
            >
              <ListChecks size={16} strokeWidth={2.5} />
              Adjustment Bill List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* Details panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Bill Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Customer" required>
                <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls}>
                  <option value="">Select value</option>
                  {customers.map((c) => <option key={rid(c)} value={rid(c)}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ledger">
                <select value={ledger} onChange={(e) => setLedger(e.target.value)} className={inputCls}>
                  <option value="">Select Ledger</option>
                  {ledgers.map((l) => <option key={rid(l)} value={rid(l)}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
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
              <Field label="Ref W/O No.">
                <div className="flex gap-2">
                  <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className={inputCls} placeholder="PO No." />
                  <button
                    type="button"
                    onClick={fetchFromWorkorder}
                    className="whitespace-nowrap px-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
                  >
                    Fetch
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Content Body">
                <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={4} className={`${inputCls} w-full resize-none`} />
              </Field>
            </div>
          </div>

          {/* Budget tables */}
          <ItemsTable
            title="Proposed Budget"
            rows={proposedRows}
            onAddRow={addProposedRow}
            onUpdateRow={updateProposedRow}
            onRemoveRow={removeProposedRow}
          />

          <ItemsTable
            title="Adjustment Budget"
            rows={adjustmentRows}
            onAddRow={addAdjustmentRow}
            onUpdateRow={updateAdjustmentRow}
            onRemoveRow={removeAdjustmentRow}
          />

          {/* Totals panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Totals</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Field label="Subtotal">
                <input value={subtotal.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 text-slate-700 font-medium`} />
              </Field>
              <Field label="VAT (%)">
                <div className="flex items-center gap-2">
                  <input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={inputCls} />
                  <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                    <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="accent-indigo-600" /> Include
                  </label>
                </div>
              </Field>
              <Field label="VAT Amount">
                <input value={vatAmount.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 text-slate-700`} />
              </Field>
              <Field label="AIT (%)">
                <div className="flex items-center gap-2">
                  <input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className={inputCls} />
                  <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                    <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} className="accent-indigo-600" /> Include
                  </label>
                </div>
              </Field>
              <Field label="AIT Amount">
                <input value={aitAmount.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 text-slate-700`} />
              </Field>
              <Field label="Interest Rate (%)">
                <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Interest Amount">
                <input value={interestAmount.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 text-slate-700`} />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className={`${inputCls} bg-indigo-50 text-indigo-700 font-semibold`} />
              </Field>
              <Field label="Paid">
                <input value={paid.toLocaleString()} readOnly className={`${inputCls} bg-emerald-50 text-emerald-700 font-medium`} />
              </Field>
              <Field label="Due">
                <input value={due.toLocaleString()} readOnly className={`${inputCls} bg-red-50 text-red-700 font-medium`} />
              </Field>
            </div>
            <div className="mt-4 max-w-sm">
              <Field label="Attachment">
                <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-500 cursor-pointer hover:bg-slate-50 transition">
                  <Upload size={14} className="text-slate-400" />
                  <span className="truncate">{attachmentName || 'Choose File'}</span>
                  <input type="file" className="hidden" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} />
                </label>
              </Field>
            </div>
          </div>

          {/* Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-700">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                      {['Transaction ID', 'Method', 'Cheque No', 'Amount', 'Date', 'Action'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No payments added</td></tr>
                    ) : (
                      payments.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{p.transactionId}</td>
                          <td className="px-3 py-2.5 text-slate-700">{p.paymentMethod}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.chequeReceiptNo || '-'}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{num(p.amount).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-slate-600">{p.date}</td>
                          <td className="px-3 py-2.5">
                            <button type="button" onClick={() => removePayment(i)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Add Payment</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Payment Method" required>
                  <div className="flex items-center gap-2">
                    <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls} />
                    <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                      <input type="checkbox" checked={payIsCheque} onChange={(e) => setPayIsCheque(e.target.checked)} className="accent-indigo-600" /> Cheque
                    </label>
                  </div>
                </Field>
                <Field label="Payment Date">
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Cheque Receipt No">
                  <input value={payChequeNo} onChange={(e) => setPayChequeNo(e.target.value)} className={inputCls} placeholder="Cheque Receipt No" />
                </Field>
                <Field label="Amount" required>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addPayment}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Add Payment
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
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
      {showCustomerModal && (
        <CustomerAddModal
          chartGroups={chartGroups}
          onClose={() => setShowCustomerModal(false)}
          onCreated={(c) => { setCustomers((prev) => [...prev, c]); setCustomer(rid(c)); setShowCustomerModal(false); }}
        />
      )}
    </div>
  );
}

function ItemsTable({ title, rows, onAddRow, onUpdateRow, onRemoveRow }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} /> Add Row
        </button>
      </div>
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
                  <td className="px-4 py-2.5">
                    <input value={r.itemName} onChange={(e) => onUpdateRow(i, 'itemName', e.target.value)} className={`${inputSmCls} w-32`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input value={r.description} onChange={(e) => onUpdateRow(i, 'description', e.target.value)} className={`${inputSmCls} w-40`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input value={r.unit} onChange={(e) => onUpdateRow(i, 'unit', e.target.value)} className={`${inputSmCls} w-16`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" value={r.quantity} onChange={(e) => onUpdateRow(i, 'quantity', e.target.value)} className={`${inputSmCls} w-16`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" value={r.rate} onChange={(e) => onUpdateRow(i, 'rate', e.target.value)} className={`${inputSmCls} w-20`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="file" onChange={(e) => onUpdateRow(i, 'image', e.target.files?.[0]?.name || '')} className="w-28 text-[10px] text-slate-500" />
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{(num(r.rate) * num(r.quantity)).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => onRemoveRow(i)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
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

function CustomerAddModal({ chartGroups, onClose, onCreated }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [buyerReference, setBuyerReference] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [chartGroup, setChartGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Chart Of Accounts codes are scoped by contactType (CUS/SUP/INV prefixes).
    api.get('/chart-of-accounts/next-code', { params: { contactType: 'Customer' } })
      .then((res) => setCode(res.data.code))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!chartGroup) {
      setError('Chart Of Groups is required');
      return;
    }
    setSaving(true);
    try {
      // This modal writes into the Chart Of Accounts table (contactType: 'Customer'),
      // the same table the Customer Accounts page reads from/writes to. Keeping this
      // in sync is what makes newly-added customers show up in the dropdown above.
      const fd = new FormData();
      fd.append('code', code);
      fd.append('name', name.trim());
      fd.append('mobile', mobile);
      fd.append('buyerReference', buyerReference);
      fd.append('address', address);
      fd.append('creditLimit', creditLimit);
      fd.append('dueDate', dueDate);
      fd.append('openingBalance', openingBalance);
      fd.append('chartOfGroup', chartGroup);
      fd.append('contactType', 'Customer');

      const res = await api.post('/chart-of-accounts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Customer Add" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Code"><input value={code} readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono`} /></Field>
          <Field label="Name" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Mobile Number"><input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} /></Field>
          <Field label="Buyer Reference"><input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)} className={inputCls} /></Field>
          <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
          <Field label="Credit Limit"><input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className={inputCls} /></Field>
          <Field label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Opening Balance"><input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className={inputCls} /></Field>
          <Field label="Chart Of Groups" required>
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