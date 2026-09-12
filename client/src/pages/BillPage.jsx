import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getContacts, createContact, getNextContactCode } from '../api/contactAccounts';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getCategories } from '../api/category';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import { createItem } from '../api/item';
import {
  getBill, getNextBillCode, createBill, updateBill,
  uploadBillAttachment, downloadBillPdf, sendBillEmail, getBillAttachmentUrl,
} from '../api/bill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X, ListOrdered, UserPlus, ShoppingBag, Download, Mail, Loader2 } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function genTxnId() {
  return 'TXN' + Math.floor(100000 + Math.random() * 900000);
}
function getId(obj) { return obj?.id ?? obj?._id ?? ''; }

const STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue', 'Cancelled'];

export default function BillPage() {
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
  const [status, setStatus] = useState('Unpaid');

  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [rows, setRows] = useState([]);

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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getContacts('Customer')
      .then(({ data }) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {});
    getChartOfAccounts()
      .then((data) => setLedgers(Array.isArray(data) ? data : (data?.rows || [])))
      .catch(() => {});
    getChartOfGroups()
      .then((data) => setChartGroups(Array.isArray(data) ? data : (data?.rows || [])))
      .catch(() => {});
    api.get('/projects').then((res) => setProjects(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get('/sites').then((res) => setSites(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    getCategories().then((data) => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
    getBrands().then((data) => setBrands(Array.isArray(data) ? data : [])).catch(() => {});
    getUnits().then((data) => setUnits(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getBill(id).then((b) => {
      setDate(b.date || '');
      setCustomer(b.customerId || getId(b.Customer) || getId(b.customer) || '');
      setLedger(b.ledgerId || getId(b.Ledger) || getId(b.ledger) || '');
      setCode(b.code || '');
      setProjectType(b.projectType || '');
      setProject(b.projectId || getId(b.Project) || getId(b.project) || '');
      setSite(b.siteId || getId(b.Site) || getId(b.site) || '');
      setRefWoNo(b.refWoNo || '');
      setContentBody(b.contentBody || '');
      setAttachmentUrl(b.attachment || '');
      setStatus(b.status || (num(b.due) <= 0 ? 'Paid' : 'Unpaid'));
      const items = b.BillLineItems || b.items || [];
      setRows(items.map((it) => ({
        itemName: it.itemName || '',
        description: it.description || '',
        unit: it.unit || '',
        quantity: it.quantity || 0,
        rate: it.rate || 0,
        image: it.image || '',
        amount: it.amount || 0,
      })));
      setVatIncluded(!!b.vatIncluded);
      setVatPercent(b.vatPercent || 0);
      setAitIncluded(!!b.aitIncluded);
      setAitPercent(b.aitPercent || 0);
      setInterestRate(b.interestRate || 0);
      const pmts = b.BillPayments || b.payments || [];
      setPayments(pmts.map((p) => ({
        transactionId: p.transactionId || '',
        paymentMethod: p.paymentMethod || '',
        isCheque: !!p.isCheque,
        chequeReceiptNo: p.chequeReceiptNo || '',
        amount: p.amount || 0,
        date: p.date || '',
      })));
    }).catch((err) => {
      console.error(err);
      setError('Failed to load bill.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [rows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const aitAmount = aitIncluded ? subtotal * (num(aitPercent) / 100) : 0;
  const interestAmount = subtotal * (num(interestRate) / 100);
  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;
  const paid = useMemo(() => payments.reduce((s, p) => s + num(p.amount), 0), [payments]);
  const due = grandTotal - paid;
  const isPaid = due <= 0 && grandTotal > 0;

  function addRow() {
    setRows((prev) => [...prev, { itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0 }]);
  }
  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleAttachmentChange(file) {
    if (!file) return;
    setUploadingAttachment(true);
    setError('');
    try {
      const url = await uploadBillAttachment(file);
      setAttachmentUrl(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  }

  function addPayment() {
    if (num(payAmount) <= 0) return;
    setPayments((prev) => [...prev, {
      transactionId: genTxnId(), paymentMethod: payMethod, isCheque: payIsCheque,
      chequeReceiptNo: payChequeNo, amount: num(payAmount), date: payDate,
    }]);
    setPayChequeNo(''); setPayAmount(0);
  }
  function removePayment(i) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleDownloadPdf() {
    if (!isEdit) return;
    setDownloading(true);
    try {
      await downloadBillPdf(id, `Invoice-${code}.pdf`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customer) { setError('Customer is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        code, date, customer, ledger, projectType, project, site, refWoNo, contentBody,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        attachment: attachmentUrl, status, vatIncluded, vatPercent, aitIncluded, aitPercent,
        interestRate, payments,
      };
      if (isEdit) { await updateBill(id, payload); } else { await createBill(payload); }
      navigate('/billing/bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save bill');
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
            <Breadcrumb items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Billing', to: '/billing/bill_list' },
              { label: 'Invoice/Bill List' },
            ]} />
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Bill / Invoice' : 'New Bill / Invoice'}
              </h1>
              {isEdit && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-red-50 text-red-600 ring-red-600/20'
                }`}>
                  {isPaid ? '✓ Paid' : '✗ Unpaid'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Fill in the details below to {isEdit ? 'update the' : 'create a new'} bill
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isEdit && (
              <>
                <button type="button" onClick={handleDownloadPdf} disabled={downloading}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 no-print">
                  {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {downloading ? 'Preparing...' : 'Download PDF'}
                </button>
                <button type="button" onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors no-print">
                  <Mail size={15} /> Email
                </button>
              </>
            )}
            <button type="button" onClick={() => setShowItemModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors no-print">
              <ShoppingBag size={15} /> Item Add
            </button>
            <button type="button" onClick={() => setShowCustomerModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors no-print">
              <UserPlus size={15} /> Contacts Add
            </button>
            <button type="button" onClick={() => navigate('/billing/bill_list')}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors no-print">
              <ListOrdered size={15} /> Bill List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
          )}

          {/* Main fields */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              </Field>
              <Field label="Customer" required>
                <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="input">
                  <option value="">Select One Option</option>
                  {customers.map((c) => (
                    <option key={getId(c)} value={getId(c)}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ledger">
                <select value={ledger} onChange={(e) => setLedger(e.target.value)} className="input">
                  <option value="">Select Ledger</option>
                  {ledgers.map((l) => (
                    <option key={getId(l)} value={getId(l)}>
                      {l.code ? `${l.code}-${l.name}` : l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className="input bg-slate-50 text-slate-500 font-mono" />
              </Field>
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input">
                  <option value="">Select Project Type</option>
                  {projectTypes.map((pt) => (
                    <option key={getId(pt)} value={pt.name}>{pt.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={getId(p)} value={getId(p)}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                  <option value="">Select Site</option>
                  {sites.map((s) => (
                    <option key={getId(s)} value={getId(s)}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ref W/O No.">
                <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className="input" placeholder="PO No." />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Content Body">
                <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={4} className="input w-full" />
              </Field>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Line Items</h2>
              <button type="button" onClick={addRow}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors no-print">
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
                  ) : rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2">
                        <input value={r.itemName} onChange={(e) => updateRow(i, 'itemName', e.target.value)}
                          className="w-32 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)}
                          className="w-40 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={r.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)}
                          className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                          className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)}
                          className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="file" onChange={(e) => updateRow(i, 'image', e.target.files?.[0]?.name || '')}
                          className="w-28 text-xs text-slate-500" />
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-700">
                        {(num(r.rate) * num(r.quantity)).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 no-print">
                        <button type="button" onClick={() => removeRow(i)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attachment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 no-print">
            <Field label="Attachment">
              <input
                type="file"
                onChange={(e) => handleAttachmentChange(e.target.files?.[0])}
                disabled={uploadingAttachment}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition disabled:opacity-50"
              />
              {uploadingAttachment && (
                <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Uploading...
                </p>
              )}
              {!uploadingAttachment && attachmentUrl && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Current:{' '}
                  <a href={getBillAttachmentUrl(attachmentUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium hover:underline">
                    View attached file
                  </a>
                </p>
              )}
            </Field>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Totals</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Field label="Subtotal">
                <input value={subtotal.toLocaleString()} readOnly className="input bg-slate-50 text-slate-500 font-semibold" />
              </Field>
              <Field label="VAT(%)">
                <div className="flex items-center gap-2">
                  <input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="input" />
                  <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                    <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="accent-indigo-600" /> Include
                  </label>
                </div>
              </Field>
              <Field label="VAT Amount">
                <input value={vatAmount.toLocaleString()} readOnly className="input bg-slate-50 text-slate-500" />
              </Field>
              <Field label="AIT(%)">
                <div className="flex items-center gap-2">
                  <input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className="input" />
                  <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                    <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} className="accent-indigo-600" /> Include
                  </label>
                </div>
              </Field>
              <Field label="AIT Amount">
                <input value={aitAmount.toLocaleString()} readOnly className="input bg-slate-50 text-slate-500" />
              </Field>
              <Field label="Interest Rate(%)">
                <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="input" />
              </Field>
              <Field label="Interest Amount">
                <input value={interestAmount.toLocaleString()} readOnly className="input bg-slate-50 text-slate-500" />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className="input bg-slate-50 font-bold text-slate-800" />
              </Field>
              <Field label="Paid">
                <input value={paid.toLocaleString()} readOnly className="input bg-slate-50 text-emerald-600 font-semibold" />
              </Field>
              <Field label="Due">
                <input value={due.toLocaleString()} readOnly className={`input bg-slate-50 font-semibold ${due > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
              </Field>
            </div>
          </div>

          {/* Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment history */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Payment History</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  isPaid ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                }`}>
                  {isPaid ? 'Fully Paid' : `Due: ${due.toLocaleString()}`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                      {['Transaction ID', 'Method', 'Cheque No', 'Amount', 'Date', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No payments added</td></tr>
                    ) : payments.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 whitespace-nowrap">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.transactionId}</td>
                        <td className="px-4 py-2.5">{p.paymentMethod}</td>
                        <td className="px-4 py-2.5">{p.chequeReceiptNo || '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{num(p.amount).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-slate-500">{p.date}</td>
                        <td className="px-4 py-2.5 no-print">
                          <button type="button" onClick={() => removePayment(i)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add payment */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5 no-print">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Add Payment</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Payment Method" required>
                  <div className="flex items-center gap-2">
                    <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="input flex-1" />
                    <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                      <input type="checkbox" checked={payIsCheque} onChange={(e) => setPayIsCheque(e.target.checked)} className="accent-indigo-600" /> Cheque
                    </label>
                  </div>
                </Field>
                <Field label="Payment Date">
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="input" />
                </Field>
                <Field label="Cheque Receipt No">
                  <input value={payChequeNo} onChange={(e) => setPayChequeNo(e.target.value)} className="input" placeholder="Cheque Receipt No" />
                </Field>
                <Field label="Amount" required>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input" />
                </Field>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button type="button" onClick={addPayment}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
                  <Plus size={15} /> Add Payment
                </button>
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-7 py-2.5 rounded-lg disabled:opacity-50 transition-colors text-sm">
                  {submitting ? 'Saving...' : isEdit ? 'Update Bill' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showItemModal && (
        <ItemAddModal
          categories={categories} brands={brands} units={units}
          onBrandCreated={(b) => setBrands((prev) => [...prev, b])}
          onClose={() => setShowItemModal(false)}
          onCreated={() => setShowItemModal(false)}
        />
      )}
      {showCustomerModal && (
        <CustomerAddModal
          chartGroups={chartGroups}
          onClose={() => setShowCustomerModal(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c]);
            setCustomer(getId(c));
            setShowCustomerModal(false);
          }}
        />
      )}
      {showEmailModal && (
        <EmailModal
          billId={id}
          code={code}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}

function EmailModal({ billId, code, onClose }) {
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!to.trim()) { setError('Recipient email is required'); return; }
    setSending(true); setError('');
    try {
      await sendBillEmail(billId, to.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Email Invoice</h2>
        <p className="text-sm text-slate-500 mb-4">Send {code} as a PDF attachment.</p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
            Invoice sent to {to}.
          </div>
        ) : (
          <form onSubmit={handleSend}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
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

  function getId(obj) { return obj?.id ?? obj?._id ?? ''; }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return;
    try {
      const created = await createBrand({ name: newBrandName.trim() });
      onBrandCreated(created);
      setBrand(getId(created));
      setNewBrandName(''); setShowBrandInput(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add brand');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (!name.trim()) { setError('Item Name is required'); return; }
    setSaving(true);
    try {
      await createItem({ category, brand, name: name.trim(), unit, purchasePrice, salePrice });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add item');
    } finally { setSaving(false); }
  }

  return (
    <InlineModal title="New Item" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={getId(c)} value={getId(c)}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <div className="flex gap-2">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="input flex-1">
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={getId(b)} value={getId(b)}>{b.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowBrandInput((s) => !s)}
                className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                <Plus size={15} />
              </button>
            </div>
            {showBrandInput && (
              <div className="flex gap-2 mt-2">
                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="New brand name" className="input flex-1" />
                <button type="button" onClick={handleAddBrand}
                  className="px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm transition-colors">Add</button>
              </div>
            )}
          </Field>
          <Field label="Item Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name" className="input" />
          </Field>
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
              <option value="">Select Unit</option>
              {units.map((u) => <option key={getId(u)} value={getId(u)}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase Price">
            <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Enter Purchase Price" className="input" />
          </Field>
          <Field label="Sale Price">
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Sale Price" className="input" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">Close</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </InlineModal>
  );
}

function CustomerAddModal({ chartGroups, onClose, onCreated }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [nid, setNid] = useState('');
  const [buyerReference, setBuyerReference] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [chartGroup, setChartGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function getId(obj) { return obj?.id ?? obj?._id ?? ''; }

  useEffect(() => {
    getNextContactCode('Customer').then(({ data }) => setCode(data.code)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!chartGroup) { setError('Chart Of Groups is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('code', code);
      fd.append('name', name.trim());
      fd.append('mobile', mobile);
      fd.append('nid', nid);
      fd.append('buyerReference', buyerReference);
      fd.append('address', address);
      fd.append('creditLimit', creditLimit);
      fd.append('dueDate', dueDate);
      fd.append('openingBalance', openingBalance);
      fd.append('chartOfGroup', chartGroup);
      fd.append('contactType', 'Customer');
      const { data: created } = await createContact(fd);
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add customer');
    } finally { setSaving(false); }
  }

  return (
    <InlineModal title="Add Customer" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Code">
            <input value={code} readOnly className="input bg-slate-50 text-slate-500 font-mono" />
          </Field>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" className="input" />
          </Field>
          <Field label="Mobile Number">
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter Mobile" className="input" />
          </Field>
          <Field label="NID">
            <input value={nid} onChange={(e) => setNid(e.target.value)} placeholder="Enter NID" className="input" />
          </Field>
          <Field label="Buyer Reference">
            <input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)}
              placeholder="Enter Business Name" className="input" />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter Address" className="input" />
          </Field>
          <Field label="Credit Limit">
            <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="Enter Credit Limit" className="input" />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="Opening Balance" className="input" />
          </Field>
          <Field label="Chart Of Groups" required>
            <select value={chartGroup} onChange={(e) => setChartGroup(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {chartGroups.map((g) => <option key={getId(g)} value={getId(g)}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">Close</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </InlineModal>
  );
}

function InlineModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 mb-5">{title}</h2>
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