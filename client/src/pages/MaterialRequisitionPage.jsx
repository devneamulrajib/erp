import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers } from '../api/customer';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import {
  getMaterialRequisition, getNextRequisitionCode,
  createMaterialRequisition, updateMaterialRequisition,
} from '../api/materialRequisition';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2 } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function MaterialRequisitionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [demandDate, setDemandDate] = useState(new Date().toISOString().slice(0, 10));
  const [company, setCompany] = useState('');
  const [supplier, setSupplier] = useState('');
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [reference, setReference] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const [rows, setRows] = useState([]);
  const [note, setNote] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then(setSuppliers).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    getItems(category ? { category } : {}).then(setItems).catch(() => {});
  }, [category]);

  useEffect(() => {
    if (isEdit) return;
    getNextRequisitionCode().then((res) => setCode(res.code || res)).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getMaterialRequisition(id).then((r) => {
      setDate(r.date || '');
      setDemandDate(r.demandDate || '');
      setCompany(r.company || '');
      setSupplier(r.supplier?._id || r.supplier || '');
      setCode(r.code || '');
      setProjectType(r.projectType || '');
      setProject(r.project?._id || r.project || '');
      setTitleOfWork(r.titleOfWork || '');
      setTask(r.task || '');
      setSite(r.site?._id || r.site || '');
      setCategory(r.category?._id || r.category || '');
      setReference(r.reference || '');
      setRows(r.items || []);
      setNote(r.note || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load material requisition.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.demandQty), 0),
    [rows]
  );

  function addItemRow() {
    const it = items.find((x) => x._id === selectedItemId);
    if (!it) return;
    setRows((prev) => [...prev, {
      item: it._id,
      itemCode: it.code,
      itemName: it.name,
      details: '',
      unit: it.unit,
      budgetQty: 0,
      demandQty: 0,
      stockQty: 0,
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
    setSubmitting(true);
    try {
      const payload = {
        code, date, demandDate, company, supplier, projectType, project, titleOfWork, task,
        site, category, reference,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.demandQty) })),
        note,
        attachment: attachmentName,
      };
      if (isEdit) {
        await updateMaterialRequisition(id, payload);
      } else {
        await createMaterialRequisition(payload);
      }
      navigate('/requisition-module/material-requisition-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save material requisition');
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
            { label: 'Requisition', to: '/requisition-module/material-requisition-list' },
            { label: 'Material Requisition' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/requisition-module/material-requisition-list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Material Requisition List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Demand Date">
            <input type="date" value={demandDate} onChange={(e) => setDemandDate(e.target.value)} className="input" />
          </Field>
          <Field label="Company">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" placeholder="Company" />
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Supplier">
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input">
              <option value="">Select an option</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Reference">
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="input" placeholder="Reference" />
          </Field>
          <Field label="Project Type">
            <input value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input" placeholder="Select Project Type" />
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
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
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Select Item">
            <div className="flex gap-2">
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="input flex-1">
                <option value="">Select Item</option>
                {items.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
              </select>
              <button type="button" onClick={addItemRow} disabled={!selectedItemId} className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
                <Plus size={16} />
              </button>
            </div>
          </Field>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['Item Code', 'Item Name', 'Details', 'Unit', 'Budget Qty', 'Demand Qty',
                  'Stock Qty', 'Rate', 'Amount', 'Action'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-4 text-gray-400">No items added</td></tr>
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
                      <input type="number" value={r.budgetQty} onChange={(e) => updateRow(i, 'budgetQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.demandQty} onChange={(e) => updateRow(i, 'demandQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.stockQty} onChange={(e) => updateRow(i, 'stockQty', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5 font-medium">{(num(r.rate) * num(r.demandQty)).toLocaleString()}</td>
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

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Subtotal">
              <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Note/Comments">
              <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
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