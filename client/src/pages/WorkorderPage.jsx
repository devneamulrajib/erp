import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers, createCustomer, getNextCustomerCode } from '../api/customer';
import { getChartOfGroups } from '../api/chartOfGroup';
import { getItems } from '../api/item';
import {
  getWorkorder, getNextWorkorderCode,
  createWorkorder, updateWorkorder,
} from '../api/workorder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { Plus, Trash2, X, ListChecks, UserPlus, List, FileText } from 'lucide-react';

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
const inputReadOnlyCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500';

export default function WorkorderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [chartGroups, setChartGroups] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [itemCatalog, setItemCatalog] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [site, setSite] = useState('');
  const [clientOrderNo, setClientOrderNo] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [rows, setRows] = useState([]);

  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);
  const [aitIncluded, setAitIncluded] = useState(false);
  const [aitPercent, setAitPercent] = useState(0);

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then((res) => setCustomers(asArray(res))).catch((err) => console.error('Failed to load customers', err));
    getChartOfGroups().then((res) => setChartGroups(asArray(res))).catch((err) => console.error('Failed to load chart groups', err));
    api.get('/projects').then((res) => setProjects(asArray(res))).catch((err) => console.error('Failed to load projects', err));
    api.get('/project-types').then((res) => setProjectTypes(asArray(res))).catch((err) => console.error('Failed to load project types', err));
    api.get('/sites').then((res) => setSites(asArray(res))).catch((err) => console.error('Failed to load sites', err));
    getItems().then((res) => setItemCatalog(asArray(res))).catch((err) => console.error('Failed to load items', err));
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextWorkorderCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getWorkorder(id).then((o) => {
      setDate(o.date || '');
      setCustomer(o.customer?.id || o.customer || '');
      setCode(o.code || '');
      setProjectType(o.projectType?.id || o.projectType || '');
      setProject(o.project?.id || o.project || '');
      setSite(o.site?.id || o.site || '');
      setClientOrderNo(o.clientOrderNo || '');
      setRows((o.items || []).map((it) => ({
        item: it.itemId ?? it.item ?? '',
        itemName: it.itemName || '',
        description: it.description || '',
        unit: it.unit || '',
        quantity: it.quantity || 0,
        rate: it.rate || 0,
        image: it.image || '',
        amount: it.amount || 0,
      })));
      setVatIncluded(!!o.vatIncluded);
      setVatPercent(o.vatPercent || 0);
      setAitIncluded(!!o.aitIncluded);
      setAitPercent(o.aitPercent || 0);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load work order.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.quantity), 0),
    [rows]
  );
  const vatAmount = vatIncluded ? subtotal * (num(vatPercent) / 100) : 0;
  const aitAmount = aitIncluded ? subtotal * (num(aitPercent) / 100) : 0;
  const grandTotal = subtotal + vatAmount + aitAmount;

  function addRow() {
    setRows((prev) => [...prev, {
      item: '', itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0,
    }]);
  }
  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function selectCatalogItem(i, itemId) {
    const found = itemCatalog.find((it) => String(it.id) === String(itemId));
    setRows((prev) => prev.map((r, idx) => (idx === i ? {
      ...r,
      item: itemId,
      itemName: found?.name || '',
      unit: found?.unit || r.unit,
      rate: found?.salePrice ?? r.rate,
    } : r)));
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
        code, date, customer, projectType, project, site, clientOrderNo,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.quantity) })),
        attachment: attachmentName,
        vatIncluded, vatPercent, aitIncluded, aitPercent,
      };
      if (isEdit) {
        await updateWorkorder(id, payload);
      } else {
        await createWorkorder(payload);
      }
      navigate('/billing/workorder_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save work order');
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
                { label: 'Billing', to: '/billing/workorder_list' },
                { label: isEdit ? 'Workorder Edit' : 'Workorder' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Work Order' : 'New Work Order'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Create a work order with items, VAT and AIT</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
  <button
    type="button"
    onClick={addRow}
    className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
  >
    <Plus size={16} strokeWidth={2.5} />
    Add Item
  </button>
  <button
    type="button"
    onClick={() => setShowCustomerModal(true)}
    className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
  >
    <UserPlus size={16} strokeWidth={2.5} />
    Add Contact
  </button>
  {isEdit && (
    <button
      type="button"
      onClick={() => navigate(`/billing/workorder/${id}/invoice`)}
      className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
    >
      <FileText size={16} />
      Invoice
    </button>
  )}
  <button
    type="button"
    onClick={() => navigate('/billing/workorder_list')}
    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
  >
    <List size={16} />
    Work Order List
  </button>
</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* Main details card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Work Order Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Customer" required>
                <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls}>
                  <option value="">Select One Option</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {customers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">No customers found — use "Add Contact" above to create one.</p>
                )}
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputReadOnlyCls} font-mono`} />
              </Field>
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
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Client Order No.">
                <input value={clientOrderNo} onChange={(e) => setClientOrderNo(e.target.value)} className={inputCls} placeholder="PO No." />
              </Field>
              <Field label="Attachment">
                <input
                  type="file"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-medium hover:file:bg-slate-200 transition"
                />
                {attachmentName && <p className="text-xs text-slate-500 mt-1.5 truncate">Selected: {attachmentName}</p>}
              </Field>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ListChecks size={15} className="text-slate-400" /> Items
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{rows.length} added</span>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Add Item
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount', 'Action'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10">
                        <p className="text-slate-400 text-sm mb-3">No items added yet</p>
                        <button
                          type="button"
                          onClick={addRow}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          Add your first item
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <SearchableSelect
                            options={itemCatalog.map((it) => ({ value: it.id, label: it.name }))}
                            value={r.item || ''}
                            onChange={(val) => selectCatalogItem(i, val)}
                            placeholder="Select item"
                            clearable
                            className="w-40"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} placeholder="Optional note" className="w-44 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={r.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" step="0.01" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="file" onChange={(e) => updateRow(i, 'image', e.target.files?.[0]?.name || '')} className="w-28 text-xs" />
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">{(num(r.rate) * num(r.quantity)).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => removeRow(i)} title="Remove item" className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={8} className="px-5 py-3 bg-slate-50/50 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={addRow}
                          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          Add another item
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Totals card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-xl ml-auto mb-6">
            <TotalsRow label="Subtotal" value={subtotal.toLocaleString()} />
            <TotalsRow
              label={
                <span className="flex items-center gap-2">
                  VAT (%)
                  <label className="flex items-center gap-1 text-xs font-normal text-slate-500">
                    <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="rounded border-slate-300" /> Include
                  </label>
                </span>
              }
              value={<input type="number" min="0" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={`${inputCls} !py-1.5`} />}
            />
            <TotalsRow label="VAT Amount" value={vatAmount.toLocaleString()} />
            <TotalsRow
              label={
                <span className="flex items-center gap-2">
                  AIT (%)
                  <label className="flex items-center gap-1 text-xs font-normal text-slate-500">
                    <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} className="rounded border-slate-300" /> Include
                  </label>
                </span>
              }
              value={<input type="number" min="0" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className={`${inputCls} !py-1.5`} />}
            />
            <TotalsRow label="AIT Amount" value={aitAmount.toLocaleString()} />
            <TotalsRow label="Grand Total" value={grandTotal.toLocaleString()} highlight />
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

      {showCustomerModal && (
        <CustomerAddModal
          chartGroups={chartGroups}
          onClose={() => setShowCustomerModal(false)}
          onCreated={(c) => { setCustomers((prev) => [...prev, c]); setCustomer(c.id); setShowCustomerModal(false); }}
        />
      )}
    </div>
  );
}

function TotalsRow({ label, value, highlight }) {
  return (
    <div className={`grid grid-cols-2 items-center px-5 py-3 border-b border-slate-100 last:border-0 ${highlight ? 'bg-indigo-600 text-white' : ''}`}>
      <div className={`text-sm font-medium ${highlight ? 'text-white' : 'text-slate-700'}`}>{label}</div>
      <div className={`text-sm ${highlight ? 'font-semibold text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
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
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Code"><input value={code} readOnly className={`${inputReadOnlyCls} font-mono`} /></Field>
          <Field label="Name" required><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Mobile Number"><input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} /></Field>
          <Field label="Buyer Reference"><input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)} className={inputCls} /></Field>
          <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
          <Field label="Credit Limit"><input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className={inputCls} /></Field>
          <Field label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Opening Balance"><input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className={inputCls} /></Field>
          <Field label="Chart Of Groups" required>
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