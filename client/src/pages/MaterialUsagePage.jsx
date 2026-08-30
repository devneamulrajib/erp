import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import { getItemStockQty } from '../api/purchase';
import { getEmployees } from '../api/employee';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import {
  getMaterialUsage, getNextMaterialUsageCode,
  createMaterialUsage, updateMaterialUsage,
} from '../api/materialUsage';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Trash2 } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalizes API responses that might come back as a bare array,
// or as a paginated shape like { rows: [...] } / { data: [...] } / { count, rows }.
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function MaterialUsagePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employee, setEmployee] = useState('');
  const [creditLedger, setCreditLedger] = useState('Closing Stock');
  const [debitLedger, setDebitLedger] = useState('Cost of Goods Sold (COGS)');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const [rows, setRows] = useState([]);
  const [attachmentName, setAttachmentName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects')
      .then((res) => setProjects(toArray(res.data)))
      .catch((err) => { console.error('Failed to load projects', err); setProjects([]); });

    api.get('/sites')
      .then((res) => setSites(toArray(res.data)))
      .catch((err) => { console.error('Failed to load sites', err); setSites([]); });

    api.get('/project-types')
      .then((res) => setProjectTypes(toArray(res.data)))
      .catch((err) => { console.error('Failed to load project types', err); setProjectTypes([]); });

    // getCategories() already unwraps res.data internally and resolves
    // directly to the array itself — do NOT do res.data again here.
    getCategories()
      .then((res) => setCategories(toArray(res)))
      .catch((err) => { console.error('Failed to load categories', err); setCategories([]); });

    getEmployees()
      .then((res) => setEmployees(toArray(res.data)))
      .catch((err) => { console.error('Failed to load employees', err); setEmployees([]); });

    getChartOfAccounts()
      .then((res) => setAccounts(toArray(res.data)))
      .catch((err) => { console.error('Failed to load chart of accounts', err); setAccounts([]); });
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {})
      .then((res) => setItems(toArray(res.data)))
      .catch((err) => { console.error('Failed to load items', err); setItems([]); });
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextMaterialUsageCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getMaterialUsage(id).then((u) => {
      setDate(u.date || '');
      setEmployee(u.employee || '');
      setCreditLedger(u.creditLedger || 'Closing Stock');
      setDebitLedger(u.debitLedger || 'Cost of Goods Sold (COGS)');
      setCode(u.code || '');
      setProjectType(u.projectType || '');
      setProject(u.project?.id || u.project || '');
      setTitleOfWork(u.titleOfWork || '');
      setTask(u.task || '');
      setSite(u.site?.id || u.site || '');
      setCategory(u.category?.id || u.category || '');
      setRows(u.items || []);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load material usage.');
    });
  }, [id, isEdit]);

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.useQty), 0),
    [rows]
  );

  async function handleSelectItem(itemId) {
    setSelectedItemId(itemId);
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    let stockQty = 0;
    try { stockQty = await getItemStockQty(it.id); } catch { /* default 0 */ }
    setRows((prev) => [...prev, {
      item: it.id,
      itemCode: it.code,
      itemName: it.name,
      details: '',
      unit: it.unit,
      useQty: 0,
      budgetQty: 0,
      purchaseQty: stockQty, // best-effort: total purchased so far
      stockQty,
      rate: it.purchasePrice || 0,
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
    if (!employee || !creditLedger || !debitLedger) {
      setError('Employee, Credit Ledger and Debit Ledger are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, employee, creditLedger, debitLedger, projectType, project,
        titleOfWork, task, site, category,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.useQty) })),
        attachment: attachmentName,
      };
      if (isEdit) {
        await updateMaterialUsage(id, payload);
      } else {
        await createMaterialUsage(payload);
      }
      navigate('/inventory-module/material_usage');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save material usage');
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
            { label: 'Inventory', to: '/inventory-module/material_usage' },
            { label: 'Material Usage' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/inventory-module/material_usage')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Material Usage List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Employee" required>
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="input">
              <option value="">Select One Option</option>
              {(employees || []).map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </Field>
          <Field label="Credit Ledger" required>
            <select value={creditLedger} onChange={(e) => setCreditLedger(e.target.value)} className="input">
              <option value="">Select Chart Of Account</option>
              {(accounts || []).map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Debit Ledger" required>
            <select value={debitLedger} onChange={(e) => setDebitLedger(e.target.value)} className="input">
              <option value="">Select Chart Of Account</option>
              {(accounts || []).map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input">
              <option value="">Select value</option>
              {(projectTypes || []).map((pt) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
            </select>
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              {(sites || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Select Item">
            <select value={selectedItemId} onChange={(e) => handleSelectItem(e.target.value)} className="input">
              <option value="">Select Item</option>
              {(items || []).map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Code', 'Item Name', 'Details', 'Unit', 'Use Qty', 'Budget Qty',
                  'Purchase Qty', 'Stock Qty', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-gray-400">No items added</td></tr>
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
                      <input type="number" value={r.useQty} onChange={(e) => updateRow(i, 'useQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.budgetQty} onChange={(e) => updateRow(i, 'budgetQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">{r.purchaseQty}</td>
                    <td className="px-2 py-1.5">{r.stockQty}</td>
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

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Field label="Attachment">
            <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
          </Field>
          <div className="text-sm text-gray-500">Grand Total: <span className="font-medium text-gray-800">{grandTotal.toLocaleString()}</span></div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
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