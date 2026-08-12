import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import { getItemStockQty } from '../api/purchase';
import {
  getStockTransfer, getNextStockTransferCode,
  createStockTransfer, updateStockTransfer,
} from '../api/stockTransfer';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Trash2 } from 'lucide-react';

export default function StockTransferPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employee, setEmployee] = useState('');
  const [code, setCode] = useState('');
  const [fromProjectType, setFromProjectType] = useState('');
  const [fromProject, setFromProject] = useState('');
  const [fromSite, setFromSite] = useState('');
  const [fromTask, setFromTask] = useState('');
  const [category, setCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const [rows, setRows] = useState([]);

  const [toProjectType, setToProjectType] = useState('');
  const [toProject, setToProject] = useState('');
  const [toSite, setToSite] = useState('');
  const [toTask, setToTask] = useState('');
  const [toSubTask, setToSubTask] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {}).then(setItems).catch(() => {});
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextStockTransferCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getStockTransfer(id).then((t) => {
      setDate(t.date || '');
      setEmployee(t.employee || '');
      setCode(t.code || '');
      setFromProjectType(t.fromProjectType || '');
      setFromProject(t.fromProject?._id || t.fromProject || '');
      setFromSite(t.fromSite?._id || t.fromSite || '');
      setFromTask(t.fromTask || '');
      setCategory(t.category?._id || t.category || '');
      setRows(t.items || []);
      setToProjectType(t.toProjectType || '');
      setToProject(t.toProject?._id || t.toProject || '');
      setToSite(t.toSite?._id || t.toSite || '');
      setToTask(t.toTask || '');
      setToSubTask(t.toSubTask || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load stock transfer.');
    });
  }, [id, isEdit]);

  async function handleSelectItem(itemId) {
    setSelectedItemId(itemId);
    const it = items.find((x) => x._id === itemId);
    if (!it) return;
    let availableQty = 0;
    try { availableQty = await getItemStockQty(it._id); } catch { /* default 0 */ }
    setRows((prev) => [...prev, {
      item: it._id,
      itemCode: it.code,
      itemName: it.name,
      unit: it.unit,
      quantity: 0,
      availableQty,
      details: '',
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
    if (!fromProject || !toProject) {
      setError('From Project and To Project are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, employee, fromProjectType, fromProject, fromSite, fromTask,
        category, items: rows,
        toProjectType, toProject, toSite, toTask, toSubTask,
      };
      if (isEdit) {
        await updateStockTransfer(id, payload);
      } else {
        await createStockTransfer(payload);
      }
      navigate('/inventory-module/stock_adjustment_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save stock transfer');
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
            { label: 'Inventory', to: '/inventory-module/stock_adjustment_list' },
            { label: 'Stock Transfer' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/inventory-module/stock_adjustment_list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Stock Transfer List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="User/Employee">
            <input value={employee} onChange={(e) => setEmployee(e.target.value)} className="input" placeholder="Select Employee" />
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="From Project Type">
            <input value={fromProjectType} onChange={(e) => setFromProjectType(e.target.value)} className="input" placeholder="Select value" />
          </Field>
          <Field label="From Project" required>
            <select value={fromProject} onChange={(e) => setFromProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="From Site">
            <select value={fromSite} onChange={(e) => setFromSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="If Task(From)">
            <input value={fromTask} onChange={(e) => setFromTask(e.target.value)} className="input" placeholder="Select Task" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Select Item">
            <select value={selectedItemId} onChange={(e) => handleSelectItem(e.target.value)} className="input">
              <option value="">Select Item</option>
              {items.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Code', 'Item Name', 'Unit', 'Quantity', 'Available Qty', 'Details', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-gray-400">No items added</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">{r.itemCode}</td>
                    <td className="px-2 py-1.5">{r.itemName}</td>
                    <td className="px-2 py-1.5">{r.unit}</td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">{r.availableQty}</td>
                    <td className="px-2 py-1.5">
                      <input value={r.details} onChange={(e) => updateRow(i, 'details', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" />
                    </td>
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-2">
          <Field label="To Project Type">
            <input value={toProjectType} onChange={(e) => setToProjectType(e.target.value)} className="input" placeholder="Select Project Type" />
          </Field>
          <Field label="To Project" required>
            <select value={toProject} onChange={(e) => setToProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="To Site">
            <select value={toSite} onChange={(e) => setToSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="If Task(To)">
            <input value={toTask} onChange={(e) => setToTask(e.target.value)} className="input" placeholder="Select Task" />
          </Field>
          <Field label="Sub Task(To)">
            <input value={toSubTask} onChange={(e) => setToSubTask(e.target.value)} className="input" placeholder="Select Sub Task" />
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50 mt-6"
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