import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers, createCustomer, getNextCustomerCode } from '../api/customer';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getCategories } from '../api/category';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import { createItem } from '../api/item';
import { getBill, getNextBillCode, createBill, updateBill } from '../api/bill';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function genTxnId() {
  return 'TXN' + Math.floor(100000 + Math.random() * 900000);
}

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {});
    getChartOfAccounts().then((res) => setLedgers(res.data || res)).catch(() => {});
    getChartOfGroups().then((res) => setChartGroups(res.data || res)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
    getBrands().then((res) => setBrands(res.data || res)).catch(() => {});
    getUnits().then((res) => setUnits(res.data || res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getBill(id).then((b) => {
      setDate(b.date || '');
      setCustomer(b.customer?._id || b.customer || '');
      setLedger(b.ledger?._id || b.ledger || '');
      setCode(b.code || '');
      setProjectType(b.projectType || '');
      setProject(b.project?._id || b.project || '');
      setSite(b.site?._id || b.site || '');
      setRefWoNo(b.refWoNo || '');
      setContentBody(b.contentBody || '');
      setRows(b.items || []);
      setVatIncluded(!!b.vatIncluded);
      setVatPercent(b.vatPercent || 0);
      setAitIncluded(!!b.aitIncluded);
      setAitPercent(b.aitPercent || 0);
      setInterestRate(b.interestRate || 0);
      setPayments(b.payments || []);
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

  function addRow() {
    setRows((prev) => [...prev, {
      itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0,
    }]);
  }
  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

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
        code, date, customer, ledger, projectType, project, site, refWoNo, contentBody,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        attachment: attachmentName,
        vatIncluded, vatPercent, aitIncluded, aitPercent, interestRate,
        payments,
      };
      if (isEdit) {
        await updateBill(id, payload);
      } else {
        await createBill(payload);
      }
      navigate('/billing/bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save bill');
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
            { label: 'Billing', to: '/billing/bill_list' },
            { label: 'Invoice/Bill List' },
          ]}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowItemModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Item Add
          </button>
          <button type="button" onClick={() => setShowCustomerModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Contacts Add
          </button>
          <button type="button" onClick={() => navigate('/billing/bill_list')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Bill List
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
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Ref W/O No.">
            <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className="input" placeholder="PO No." />
          </Field>
        </div>

        <Field label="Content Body">
          <textarea
            value={contentBody}
            onChange={(e) => setContentBody(e.target.value)}
            rows={5}
            className="input w-full"
          />
        </Field>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mt-4 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
                <th className="px-2 py-2 text-left font-medium">
                  Action
                  <button type="button" onClick={addRow} className="ml-2 inline-flex bg-white/20 hover:bg-white/30 rounded p-0.5">
                    <Plus size={12} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-gray-400">No items added</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">
                      <input value={r.itemName} onChange={(e) => updateRow(i, 'itemName', e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className="w-40 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={r.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} className="w-16 border border-gray-200 rounded px-2 py-1" />
                    </td>
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

        <Field label="Attachment">
          <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
        </Field>

        <div className="bg-white border border-gray-200 rounded-md p-4 my-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <Field label="AIT(%)">
              <div className="flex items-center gap-2">
                <input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className="input" />
                <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} /> Include
                </label>
              </div>
            </Field>
            <Field label="AIT Amount">
              <input value={aitAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Interest Rate(%)">
              <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="input" />
            </Field>
            <Field label="Interest Amount">
              <input value={interestAmount.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Grand Total">
              <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Paid">
              <input value={paid.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Due">
              <input value={due.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-500 text-white whitespace-nowrap">
                  {['Transaction ID', 'Payment Method', 'Cheque Receipt No', 'Amount', 'Date', 'Action'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400">No payments added</td></tr>
                ) : (
                  payments.map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">{p.transactionId}</td>
                      <td className="px-2 py-1.5">{p.paymentMethod}</td>
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
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label="Payment Method" required>
                <div className="flex items-center gap-2">
                  <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="input" />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <input type="checkbox" checked={payIsCheque} onChange={(e) => setPayIsCheque(e.target.checked)} /> if Cheque
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
            <div className="flex items-center justify-between">
              <button type="button" onClick={addPayment} className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-2 rounded-md">
                Add Payment
              </button>
              <button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50">
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
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
      {showCustomerModal && (
        <CustomerAddModal
          chartGroups={chartGroups}
          onClose={() => setShowCustomerModal(false)}
          onCreated={(c) => { setCustomers((prev) => [...prev, c]); setCustomer(c._id); setShowCustomerModal(false); }}
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
    getNextCustomerCode().then(setCode).catch(() => {});
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
      const created = await createCustomer({
        code, name: name.trim(), mobile, buyerReference, address,
        creditLimit, dueDate, openingBalance, chartGroup,
      });
      onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Customer Add" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" className="input" />
          </Field>
          <Field label="Mobile Number">
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter Mobile" className="input" />
          </Field>
          <Field label="Buyer Reference">
            <input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)} placeholder="Enter Business Name" className="input" />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter Address" className="input" />
          </Field>
          <Field label="Credit Limit">
            <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Enter Credit Limit" className="input" />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Opening Balance" className="input" />
          </Field>
          <Field label="Chart Of Groups" required>
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