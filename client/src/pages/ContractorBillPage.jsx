import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getParties, createParty, getNextPartyCode } from '../api/party';
import { getContacts } from '../api/contactAccounts';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getCategories } from '../api/category';
import { getItems, createItem } from '../api/item';
import { getBrands, createBrand } from '../api/brand';
import { getUnits } from '../api/unit';
import {
  getContractorBill, getNextContractorBillCode,
  createContractorBill, updateContractorBill, uploadContractorBillAttachment,
} from '../api/contractorBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, X, FileText, CreditCard, Package, ListChecks } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function genTxnId() {
  return 'TXN' + Math.floor(100000 + Math.random() * 900000);
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

// The "Contractor/Supplier" dropdown draws from two separate tables that
// aren't otherwise linked: Party (contractors/workers, added via
// "Labour/Worker Add" on this page) and ChartOfAccount contacts with
// contactType 'Supplier' (added on the Supplier Accounts page). A
// ContractorBill can only be billed against a Party id, so selections are
// tagged with a `party-` / `coa-` prefix and resolved to a real Party id
// right before submit — creating a matching Party on the fly the first
// time a Chart-of-Accounts supplier is billed.
const PARTY_PREFIX = 'party-';
const COA_PREFIX = 'coa-';

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const inputReadOnlyCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500';

export default function ContractorBillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [parties, setParties] = useState([]);
  const [supplierContacts, setSupplierContacts] = useState([]); // ChartOfAccount, contactType: Supplier
  const [ledgers, setLedgers] = useState([]);
  const [chartGroups, setChartGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState(''); // prefixed value: `party-<id>` or `coa-<id>`
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
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [existingAttachment, setExistingAttachment] = useState('');

  const [rows, setRows] = useState([]);
  const qtyInputRefs = useRef([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState(0);

  const [payments, setPayments] = useState([]);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payIsCheque, setPayIsCheque] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payAmount, setPayAmount] = useState(0);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [itemNotice, setItemNotice] = useState('');

  useEffect(() => {
    getParties().then((res) => setParties(asArray(res))).catch((err) => console.error('Failed to load parties', err));
    getContacts('Supplier').then((res) => setSupplierContacts(asArray(res))).catch((err) => console.error('Failed to load supplier contacts', err));
    getChartOfAccounts().then((res) => setLedgers(asArray(res))).catch((err) => console.error('Failed to load ledgers', err));
    getChartOfGroups().then((res) => setChartGroups(asArray(res))).catch((err) => console.error('Failed to load chart groups', err));
    // Confirmed from server/index.js: app.use('/api/projects', ...), app.use('/api/sites', ...),
    // app.use('/api/project-types', ...) — all plural, /api prefix handled by axios baseURL.
    api.get('/projects').then((res) => setProjects(asArray(res))).catch((err) => console.error('Failed to load projects', err));
    api.get('/project-types').then((res) => setProjectTypes(asArray(res))).catch((err) => console.error('Failed to load project types', err));
    api.get('/sites').then((res) => setSites(asArray(res))).catch((err) => console.error('Failed to load sites', err));
    getCategories().then((res) => setCategories(asArray(res))).catch((err) => console.error('Failed to load categories', err));
    getBrands().then((res) => setBrands(asArray(res))).catch((err) => console.error('Failed to load brands', err));
    getUnits().then((res) => setUnits(asArray(res))).catch((err) => console.error('Failed to load units', err));
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {}).then((res) => setItems(asArray(res))).catch((err) => console.error('Failed to load items', err));
    // Category changed, so any previously selected item no longer applies.
    setSelectedItemId('');
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextContractorBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getContractorBill(id).then((b) => {
      setDate(b.date || '');
      // Existing bills are always billed against a Party (the FK only
      // ever points there), so tag it with the party- prefix on load.
      setParty(b.partyId != null ? `${PARTY_PREFIX}${b.partyId}` : '');
      setLedger(b.ledgerId != null ? String(b.ledgerId) : '');
      setCode(b.code || '');
      setProjectType(b.projectType || '');
      setProject(b.projectId != null ? String(b.projectId) : '');
      setTitleOfWork(b.titleOfWork || '');
      setSite(b.siteId != null ? String(b.siteId) : '');
      setRefWoNo(b.refWoNo || '');
      setTask(b.task || '');
      setCategory(b.categoryId != null ? String(b.categoryId) : '');
      setRows(b.ContractorBillItems || []);
      setVatIncluded(!!b.vatIncluded);
      setVatPercent(b.vatPercent || 0);
      setSecurityDeposit(b.securityDeposit || 0);
      setPayments(b.ContractorBillPayments || []);
      setExistingAttachment(b.attachment || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load contractor bill.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [rows]
  );
  const totalQuantity = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.quantity), 0),
    [rows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const grandTotal = subtotal + vatAmount + num(securityDeposit);
  const paid = useMemo(() => payments.reduce((s, p) => s + num(p.amount), 0), [payments]);
  const due = grandTotal - paid;

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
      quantity: 0,
      rate: it.purchasePrice || 0,
      amount: 0,
    }]);
    setSelectedItemId('');
  }
  // After a row is added, jump straight into its Quantity field so the user
  // can type the real value without hunting for it.
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

  // Resolves the dropdown's tagged selection to a real Party id.
  // - `party-<id>` selections already point at a Party: return the id.
  // - `coa-<id>` selections point at a ChartOfAccount supplier: reuse a
  //   Party with the same name if one exists, otherwise create one so the
  //   bill (and every report reading Party + ContractorBill) has something
  //   real to link against.
  async function resolvePartyId(selection) {
    if (!selection) return null;
    if (selection.startsWith(PARTY_PREFIX)) {
      return selection.slice(PARTY_PREFIX.length);
    }
    if (selection.startsWith(COA_PREFIX)) {
      const coaId = selection.slice(COA_PREFIX.length);
      const contact = supplierContacts.find((c) => sameId(c.id, coaId));
      if (!contact) return null;

      const existing = parties.find(
        (p) => p.name?.trim().toLowerCase() === contact.name?.trim().toLowerCase()
      );
      if (existing) return existing.id;

      const created = await createParty({
        name: contact.name,
        phone: contact.mobile || '',
        address: contact.address || '',
        openingBalance: contact.openingBalance || 0,
        creditLimit: contact.creditLimit || 0,
        dueDate: contact.dueDate || null,
        type: 'supplier',
      });
      setParties((prev) => [...prev, created]);
      return created.id;
    }
    // Legacy/plain numeric value (shouldn't normally happen once every
    // option is prefixed) — treat it as an existing Party id.
    return selection;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!party) {
      setError('Contractor/Supplier is required');
      return;
    }
    setSubmitting(true);
    try {
      const resolvedPartyId = await resolvePartyId(party);
      if (!resolvedPartyId) {
        setError('Could not resolve the selected Contractor/Supplier. Please pick it again.');
        setSubmitting(false);
        return;
      }

      const payload = {
        code, date, party: resolvedPartyId, ledger, projectType, project, titleOfWork, task,
        site, category, refWoNo,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        vatIncluded, vatPercent, securityDeposit,
        payments,
      };
      let billId = id;
      if (isEdit) {
        await updateContractorBill(id, payload);
      } else {
        const created = await createContractorBill(payload);
        billId = created.id;
      }
      if (attachmentFile && billId) {
        await uploadContractorBillAttachment(billId, attachmentFile);
      }
      navigate('/billing/vendor_bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save contractor bill');
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
                { label: 'Contractor/Supplier Bill', to: '/billing/vendor_bill_list' },
                { label: isEdit ? 'Contractor/Supplier Bill Edit' : 'Contractor/Supplier Bill Add' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Contractor/Supplier Bill' : 'New Contractor/Supplier Bill'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Record work items, costs, and payments for a contractor or supplier</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowItemModal(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Item Add
            </button>
            <button
              type="button"
              onClick={() => setShowPartyModal(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Labour/Worker Add
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing/vendor_bill_list')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              Contractor Bill List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* Main details card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Bill Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Contractor/Supplier" required>
                <select value={party} onChange={(e) => setParty(e.target.value)} className={inputCls}>
                  <option value="">Select One Option</option>
                  {supplierContacts.length > 0 && (
                    <optgroup label="Suppliers">
                      {supplierContacts.map((c) => (
                        <option key={`${COA_PREFIX}${c.id}`} value={`${COA_PREFIX}${c.id}`}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {parties.length > 0 && (
                    <optgroup label="Contractors / Workers">
                      {parties.map((p) => (
                        <option key={`${PARTY_PREFIX}${p.id}`} value={`${PARTY_PREFIX}${p.id}`}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {parties.length === 0 && supplierContacts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    No contractors or suppliers found — use "Labour/Worker Add" above, or add one on the Supplier Accounts page.
                  </p>
                )}
              </Field>
              <Field label="Ledger">
                <select value={ledger} onChange={(e) => setLedger(e.target.value)} className={inputCls}>
                  <option value="">Select Ledger</option>
                  {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputReadOnlyCls} font-mono`} />
              </Field>
            </div>

            <div className="border-t border-slate-100 my-5" />

            <h2 className="text-sm font-semibold text-slate-800 mb-4">Project &amp; Work Reference</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
                  <option value="">Select value</option>
                  {projectTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title/Name of Work">
                <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className={inputCls} placeholder="Select Title/Name of Work" />
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Ref W/O No.">
                <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className={inputCls} placeholder="PO No." />
              </Field>
              <Field label="If Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} placeholder="Select Task" />
              </Field>
            </div>

            <div className="border-t border-slate-100 my-5" />

            <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Package size={15} className="text-slate-400" /> Add Items
            </h2>
            <p className="text-xs text-slate-400 mb-4">Pick a category to narrow the list, choose an item, then click + to add it to the table below.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Select Item">
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {items.length === 0
                    ? (category ? 'No items in this category yet — use "Item Add" above to create one.' : 'No items yet — use "Item Add" above to create one.')
                    : (category ? `Showing items in "${selectedCategoryName || 'this category'}"` : 'Showing all items — pick a category to narrow this list')}
                </p>
                {itemNotice && <p className="text-xs text-red-500 mt-1">{itemNotice}</p>}
              </Field>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ListChecks size={15} className="text-slate-400" /> Bill Items
              </h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{rows.length} added</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount', 'Action'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                        No items added yet — choose a category and item above, then click <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-600 text-white align-middle mx-0.5"><Plus size={11} /></span> to add it here.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 text-slate-700 font-medium">{r.itemName}</td>
                        <td className="px-5 py-3">
                          <input
                            value={r.description}
                            onChange={(e) => updateRow(i, 'description', e.target.value)}
                            placeholder="Optional note"
                            className="w-44 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-700">{r.unit}</td>
                        <td className="px-5 py-3">
                          <input
                            ref={(el) => (qtyInputRefs.current[i] = el)}
                            type="number"
                            min="0"
                            value={r.quantity}
                            onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={r.rate}
                            onChange={(e) => updateRow(i, 'rate', e.target.value)}
                            className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">{(num(r.rate) * num(r.quantity)).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            title="Remove item"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          >
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

          {/* Totals card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Totals</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Subtotal">
                <input value={subtotal.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="VAT (%)">
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={inputCls} />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                    <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="rounded border-slate-300" /> Include
                  </label>
                </div>
              </Field>
              <Field label="VAT Amount">
                <input value={vatAmount.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="Security Deposit">
                <input type="number" min="0" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} className={inputCls} placeholder="Security Deposit" />
              </Field>
              <Field label="Total Quantity">
                <input value={totalQuantity.toLocaleString()} readOnly className={inputReadOnlyCls} />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className={`${inputReadOnlyCls} font-semibold text-slate-900`} />
              </Field>
              <Field label="Paid">
                <input value={paid.toLocaleString()} readOnly className={`${inputReadOnlyCls} text-emerald-600 font-medium`} />
              </Field>
              <Field label="Due">
                <input value={due.toLocaleString()} readOnly className={`${inputReadOnlyCls} text-red-600 font-medium`} />
              </Field>
              <Field label="Attachment">
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAttachmentFile(f);
                    setAttachmentName(f?.name || '');
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-medium hover:file:bg-slate-200 transition"
                />
                {attachmentName && <p className="text-xs text-slate-500 mt-1.5 truncate">Selected: {attachmentName}</p>}
                {!attachmentName && existingAttachment && (
                  <p className="text-xs text-slate-500 mt-1.5 truncate">Current file on record — choose a new one to replace it.</p>
                )}
              </Field>
            </div>
          </div>

          {/* Payments row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={15} className="text-slate-400" /> Payments
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{payments.length} added</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                      {['Transaction ID', 'Method', 'Cheque No', 'Amount', 'Date', 'Action'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No payments added yet</td>
                      </tr>
                    ) : (
                      payments.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{p.transactionId}</td>
                          <td className="px-4 py-2.5 text-slate-700">{p.paymentMethod}</td>
                          <td className="px-4 py-2.5 text-slate-700">{p.chequeReceiptNo || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-900 font-medium">{num(p.amount).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-slate-700">{p.date}</td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => removePayment(i)}
                              title="Remove payment"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                            >
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
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <CreditCard size={15} className="text-slate-400" /> Add Payment
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Payment Method" required>
                  <div className="flex items-center gap-2">
                    <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls} />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                      <input type="checkbox" checked={payIsCheque} onChange={(e) => setPayIsCheque(e.target.checked)} className="rounded border-slate-300" /> If Cheque
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
                  <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={addPayment}
                  disabled={num(payAmount) <= 0}
                  title={num(payAmount) <= 0 ? 'Enter an amount first' : 'Add this payment'}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add Payment
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
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
      {showPartyModal && (
        <PartyAddModal
          chartGroups={chartGroups}
          onClose={() => setShowPartyModal(false)}
          onCreated={(p) => { setParties((prev) => [...prev, p]); setParty(`${PARTY_PREFIX}${p.id}`); setShowPartyModal(false); }}
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
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
              >
                <Plus size={16} />
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
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Code">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Customer Code" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" className={inputCls} />
          </Field>
          <Field label="Phone/Mobile">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter Phone/Mobile" className={inputCls} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter Address" className={inputCls} />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Enter Opening Balance" className={inputCls} />
          </Field>
          <Field label="Credit Limit">
            <input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Enter Credit Limit" className={inputCls} />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Under">
            <select value={chartGroup} onChange={(e) => setChartGroup(e.target.value)} className={inputCls}>
              <option value="">Select One Option</option>
              {chartGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}