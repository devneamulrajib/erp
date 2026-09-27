import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getContacts } from '../api/contactAccounts';
import { getCategories } from '../api/category';
import { getItems } from '../api/item';
import {
  getMaterialRequisition, getNextRequisitionCode,
  createMaterialRequisition, updateMaterialRequisition,
} from '../api/materialRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2, ArrowLeft, Paperclip } from 'lucide-react';

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const readOnlyCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';
const cellInputCls = 'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function MaterialRequisitionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
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
  const [existingAttachment, setExistingAttachment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getContacts('Supplier').then((res) => setSuppliers(res.data)).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data)).catch(() => {});
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
      setSupplier(r.supplier?.id || r.supplierId || r.supplier || '');
      setCode(r.code || '');
      setProjectType(r.projectType?.id || r.projectTypeId || r.projectType || '');
      setProject(r.project?.id || r.projectId || r.project || '');
      setTitleOfWork(r.titleOfWork || '');
      setTask(r.task || '');
      setSite(r.site?.id || r.siteId || r.site || '');
      setCategory(r.category?.id || r.categoryId || r.category || '');
      setReference(r.reference || '');
      setRows(r.items || []);
      setNote(r.note || '');
      setExistingAttachment(r.attachment || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load material requisition.');
    });
  }, [id, isEdit]);

  function addItemRow() {
    const it = items.find((x) => String(x.id) === String(selectedItemId));
    if (!it) return;
    setRows((prev) => [...prev, {
      item: it.id,
      itemCode: it.code,
      itemName: it.name,
      details: '',
      unit: it.unit,
      budgetQty: 0,
      demandQty: 0,
      stockQty: 0,
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
    if (rows.length === 0) {
      setError('Add at least one item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, demandDate, company, supplier, projectType, project, titleOfWork, task,
        site, category, reference,
        items: rows,
        note,
        attachment: attachmentName || existingAttachment,
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
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Requisition', to: '/requisition-module/material-requisition-list' },
                { label: isEdit ? 'Edit Material Requisition' : 'Material Requisition' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Material Requisition' : 'New Material Requisition'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? `Editing ${code || 'requisition'}` : 'Ask a supplier which of these items they can deliver — pricing comes back from them'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/requisition-module/material-requisition-list')}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeft size={15} /> Material Requisition List
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Demand Date">
                <input type="date" value={demandDate} onChange={(e) => setDemandDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Company">
                <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Company" />
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={readOnlyCls} />
              </Field>
              <Field label="Supplier">
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
                  <option value="">Select an option</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Reference">
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} placeholder="Reference" />
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
                  <option value="">Select Project Type</option>
                  {projectTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title/Name of Work">
                <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className={inputCls} placeholder="Enter title or name of work" />
              </Field>
              <Field label="If Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} placeholder="Enter task details (if applicable)" />
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Select Item">
                <div className="flex gap-2">
                  <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className={`${inputCls} flex-1`}>
                    <option value="">Select Item</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={!selectedItemId}
                    title="Add item"
                    aria-label="Add item"
                    className="px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    {['Item Code', 'Item Name', 'Details', 'Unit', 'Budget Qty', 'Demand Qty',
                      'Stock Qty', 'Action'].map((h) => (
                      <th key={h} className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">No items added</td></tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-2 py-2 text-slate-600 font-mono">{r.itemCode}</td>
                        <td className="px-2 py-2 font-medium text-slate-700">{r.itemName}</td>
                        <td className="px-2 py-2">
                          <input value={r.details} onChange={(e) => updateRow(i, 'details', e.target.value)} className={cellInputCls} />
                        </td>
                        <td className="px-2 py-2 text-slate-600">{r.unit}</td>
                        <td className="px-2 py-2">
                          <input type="number" value={r.budgetQty} onChange={(e) => updateRow(i, 'budgetQty', e.target.value)} className={`w-20 ${cellInputCls}`} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={r.demandQty} onChange={(e) => updateRow(i, 'demandQty', e.target.value)} className={`w-20 ${cellInputCls}`} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={r.stockQty} onChange={(e) => updateRow(i, 'stockQty', e.target.value)} className={`w-20 ${cellInputCls}`} />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            title="Remove item"
                            aria-label="Remove item"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
            <p className="text-xs text-slate-400 px-4 py-3 border-t border-slate-100">
              Pricing isn't collected here — the supplier will quote a rate for each available item when they respond to this requisition.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Note/Comments">
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Attachment">
                <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className={inputCls} />
                {existingAttachment && !attachmentName && (
                  <p className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1">
                    <Paperclip size={11} /> Current file: {existingAttachment} — choose a new file to replace it
                  </p>
                )}
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}