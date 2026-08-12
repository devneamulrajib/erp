import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers, createCustomer, getNextCustomerCode } from '../api/customer';
import { getChartOfGroups } from '../api/chartOfGroup';
import {
  getWorkorder, getNextWorkorderCode,
  createWorkorder, updateWorkorder,
} from '../api/workorder';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Trash2, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function WorkorderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [chartGroups, setChartGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);

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
    getCustomers().then(setCustomers).catch(() => {});
    getChartOfGroups().then((res) => setChartGroups(res.data || res)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextWorkorderCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getWorkorder(id).then((o) => {
      setDate(o.date || '');
      setCustomer(o.customer?._id || o.customer || '');
      setCode(o.code || '');
      setProjectType(o.projectType || '');
      setProject(o.project?._id || o.project || '');
      setSite(o.site?._id || o.site || '');
      setClientOrderNo(o.clientOrderNo || '');
      setRows(o.items || []);
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
      itemName: '', description: '', unit: '', quantity: 0, rate: 0, image: '', amount: 0,
    }]);
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Billing', to: '/billing/workorder_list' },
            { label: 'Workorder' },
          ]}
        />
        <div className="flex gap-2">
          <button type="button" onClick={addRow}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Add Item
          </button>
          <button type="button" onClick={() => setShowCustomerModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Add Contact
          </button>
          <button type="button" onClick={() => navigate('/billing/workorder_list')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md">
            Work Order List
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
          <Field label="Client Order No.">
            <input value={clientOrderNo} onChange={(e) => setClientOrderNo(e.target.value)} className="input" placeholder="PO No." />
          </Field>
          <Field label="Attachment">
            <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
          </Field>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Name', 'Description', 'Unit', 'Quantity', 'Rate', 'Image', 'Amount', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
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

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden max-w-xl ml-auto">
          <TotalsRow label="Subtotal :" value={subtotal.toLocaleString()} bg="bg-blue-50" />
          <TotalsRow
            label={<>Vat(%) : <span className="text-indigo-600">If Include:</span>{' '}
              <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} /></>}
            value={<input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="input" />}
          />
          <TotalsRow label="Vat(Amount) :" value={vatAmount.toLocaleString()} bg="bg-orange-50" />
          <TotalsRow
            label={<>AIT(%) : <span className="text-emerald-600">If Include:</span>{' '}
              <input type="checkbox" checked={aitIncluded} onChange={(e) => setAitIncluded(e.target.checked)} /></>}
            value={<input type="number" value={aitPercent} onChange={(e) => setAitPercent(e.target.value)} className="input" />}
          />
          <TotalsRow label="AIT(Amount) :" value={aitAmount.toLocaleString()} bg="bg-green-50" />
          <TotalsRow label="Grand Total :" value={grandTotal.toLocaleString()} bg="bg-emerald-500 text-white font-medium" />
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>

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

function TotalsRow({ label, value, bg = 'bg-white' }) {
  return (
    <div className={`grid grid-cols-2 items-center px-4 py-2 border-b border-gray-200 last:border-0 ${bg}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm">{value}</div>
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Code"><input value={code} readOnly className="input bg-gray-50" /></Field>
          <Field label="Name" required><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <Field label="Mobile Number"><input value={mobile} onChange={(e) => setMobile(e.target.value)} className="input" /></Field>
          <Field label="Buyer Reference"><input value={buyerReference} onChange={(e) => setBuyerReference(e.target.value)} className="input" /></Field>
          <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></Field>
          <Field label="Credit Limit"><input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="input" /></Field>
          <Field label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /></Field>
          <Field label="Opening Balance"><input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="input" /></Field>
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