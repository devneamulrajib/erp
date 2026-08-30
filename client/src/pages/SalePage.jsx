import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers, createCustomer } from '../api/customer';
import { getCategories } from '../api/category';
import { getBrands } from '../api/brand';
import { getUnits } from '../api/unit';
import { getItems, createItem } from '../api/item';
import {
  getSale, getNextSaleCode, createSale, updateSale,
} from '../api/sale';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function SalePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [items, setItems] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [ledger, setLedger] = useState('Flat Sales');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [site, setSite] = useState('');
  const [refWoNo, setRefWoNo] = useState('');
  const [content, setContent] = useState('');

  const [rows, setRows] = useState([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState('');
  const [aitIncluded, setAitIncluded] = useState(false);
  const [aitPercent, setAitPercent] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [paid, setPaid] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [payments, setPayments] = useState([]);
  const [ifCheque, setIfCheque] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [chequeReceiptNo, setChequeReceiptNo] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data)).catch(() => {});
    getItems().then(setItems).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextSaleCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getSale(id).then((s) => {
      setDate(s.date || '');
      setCustomer(s.customer?.id || s.customer || '');
      setLedger(s.ledger || 'Flat Sales');
      setCode(s.code || '');
      setProjectType(s.projectType || '');
      setProject(s.project?.id || s.project || '');
      setTitleOfWork(s.titleOfWork || '');
      setSite(s.site?.id || s.site || '');
      setRefWoNo(s.refWoNo || '');
      setContent(s.content || '');
      setRows(s.items || []);
      setVatIncluded(!!s.vatIncluded);
      setVatPercent(s.vatPercent ?? '');
      setAitIncluded(!!s.aitIncluded);
      setAitPercent(s.aitPercent ?? '');
      setInterestRate(s.interestRate ?? '');
      setPaid(s.paid ?? '');
      setPayments(s.payments || []);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load sale.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [rows],
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const aitAmount = aitIncluded ? subtotal * (num(aitPercent) / 100) : 0;
  const interestAmount = subtotal * (num(interestRate) / 100);
  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;
  const dueAmount = grandTotal - num(paid);
  const paymentsTotal = payments.reduce((sum, p) => sum + num(p.amount), 0);

  function addBlankRow() {
    setRows((prev) => [...prev, {
      item: '', itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0,
    }]);
  }
  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function selectRowItem(i, itemId) {
    const it = items.find((x) => String(x.id) === String(itemId));
    if (!it) return;
    setRows((prev) => prev.map((r, idx) => (idx === i ? {
      ...r, item: it.id, itemName: it.name, unit: it.unit, rate: it.salePrice || it.purchasePrice || 0,
    } : r)));
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addPayment() {
    if (num(paymentAmount) <= 0) return;
    setPayments((prev) => [...prev, {
      transactionId: `TXN${Math.floor(100000 + Math.random() * 900000)}`,
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
    if (!customer) {
      setError('Customer is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, customer, ledger, projectType, project, titleOfWork, site, refWoNo, content,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        subtotal,
        vatIncluded, vatPercent: num(vatPercent), vatAmount,
        aitIncluded, aitPercent: num(aitPercent), aitAmount,
        interestRate: num(interestRate), interestAmount,
        grandTotal,
        paid: num(paid),
        due: dueAmount,
        attachment: attachmentName,
        payments,
      };
      if (isEdit) {
        await updateSale(id, payload);
      } else {
        await createSale(payload);
      }
      navigate('/billing/item_sale_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save sale');
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
            { label: 'Billing', to: '/billing/item_sale_list' },
            { label: 'Sale Create' },
          ]}
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowItemModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Item Add
          </button>
          <button type="button" onClick={() => setShowCustomerModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Contacts Add
          </button>
          <button type="button" onClick={() => navigate('/billing/item_sale_list')} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Sale List
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Customer" required>
            <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ledger">
            <input value={ledger} onChange={(e) => setLedger(e.target.value)} className="input" />
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input">
              <option value="">Select value</option>
              {projectTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Title/Name of Work">
            <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
          </Field>
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Ref W/O No.">
            <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className="input" placeholder="PO No." />
          </Field>
        </div>

        <Field label="Content Body">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input min-h-[140px]"
            placeholder="Content body..."
          />
        </Field>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto my-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
                <th className="px-2 py-2 text-left font-medium">
                  <button type="button" onClick={addBlankRow} className="p-1 bg-emerald-500 hover:bg-emerald-600 rounded text-white">
                    <Plus size={14} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-gray-400">No items added — click the + above to add a row</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">
                      <select value={r.item || ''} onChange={(e) => selectRowItem(i, e.target.value)} className="w-40 border border-gray-200 rounded px-2 py-1">
                        <option value="">Select Item</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={r.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
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

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Subtotal">
              <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label={<span>VAT(%) if include: <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="ml-1" /></span>}>
              <input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="input" placeholder="Vat(%)" disabled={!vatIncluded} />
            </Field>
            <Field label="VAT Amount">
              <input value={vatAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label={<span>AIT(%) if include: <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} className="ml-1" /></span>}>
              <input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className="input" placeholder="AIT(%)" disabled={!aitIncluded} />
            </Field>
            <Field label="AIT Amount">
              <input value={aitAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Interest Rate(%)">
              <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="input" placeholder="Interest(%)" />
            </Field>
            <Field label="Interest Amount">
              <input value={interestAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Grand Total">
              <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Paid">
              <input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="input" />
            </Field>
            <Field label="Due">
              <input value={dueAmount.toLocaleString()} readOnly className="input bg-gray-50 text-red-600 font-medium" />
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
              <Field label={<span>Payment Method <span className="text-red-500">*</span> <label className="ml-2 text-xs font-normal"><input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="mr-1" />if Cheque</label></span>}>
                <input value={ifCheque ? 'Cheque' : 'Cash'} readOnly className="input bg-gray-50" />
              </Field>
              <Field label="Payment Date">
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" />
              </Field>
              <Field label="Cheque Receipt No">
                <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className="input" placeholder="Cheque Receipt No" disabled={!ifCheque} />
              </Field>
              <Field label="Amount" required>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input" />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={addPayment} className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-md">
                Add Payment
              </button>
              <button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-6 py-2 rounded-md disabled:opacity-50">
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showItemModal && (
        <ItemAddModal
          onClose={() => setShowItemModal(false)}
          onCreated={(newItem) => { setItems((prev) => [...prev, newItem]); setShowItemModal(false); }}
        />
      )}
      {showCustomerModal && (
        <CustomerAddModal
          onClose={() => setShowCustomerModal(false)}
          onCreated={(newCustomer) => { setCustomers((prev) => [...prev, newCustomer]); setCustomer(newCustomer.id); setShowCustomerModal(false); }}
        />
      )}
    </div>
  );
}

function ItemAddModal({ onClose, onCreated }) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getBrands().then(setBrands).catch(() => {});
    getUnits().then(setUnits).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name) {
      setError('Item Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createItem({
        category, brand, name, unit, purchasePrice: num(purchasePrice), salePrice: num(salePrice),
      });
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-lg font-medium mb-4">New Item</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="input">
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Item Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Item Name" />
            </Field>
            <Field label="Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
                <option value="">Select Unit</option>
                {units.map((u) => <option key={u.id} value={u.name || u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Purchase Price">
              <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="input" placeholder="Enter Purchase Price" />
            </Field>
            <Field label="Sale Price">
              <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="input" placeholder="Sale Price" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-700">Close</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-md text-sm bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerAddModal({ onClose, onCreated }) {
  const [chartOfGroups, setChartOfGroups] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [buyerReference, setBuyerReference] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [chartOfGroup, setChartOfGroup] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers/next-code').then((res) => setCode(res.data?.code || '')).catch(() => {});
    api.get('/chart-of-group').then((res) => setChartOfGroups(res.data)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name || !chartOfGroup) {
      setError('Name and Chart Of Groups are required');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createCustomer({
        code, name, mobile, buyerReference, address,
        creditLimit: num(creditLimit), dueDate, openingBalance: num(openingBalance), chartOfGroup,
      });
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-lg font-medium mb-4">Customer Add</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Code">
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input" />
            </Field>
            <Field label="Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Enter Name" />
            </Field>
            <Field label="Mobile Number">
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="input" placeholder="Enter Mobile" />
            </Field>
            <Field label="Buyer Reference">
              <input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)} className="input" placeholder="Enter Business Name" />
            </Field>
            <Field label="Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="Enter Address" />
            </Field>
            <Field label="Credit Limit">
              <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="input" placeholder="Enter Credit Limit" />
            </Field>
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
            </Field>
            <Field label="Opening Balance">
              <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="input" placeholder="Opening Balance" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Chart Of Groups" required>
                <select value={chartOfGroup} onChange={(e) => setChartOfGroup(e.target.value)} className="input">
                  <option value="">Select One Option</option>
                  {chartOfGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-700">Close</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-md text-sm bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
              {submitting ? 'Saving...' : 'Submit'}
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
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}