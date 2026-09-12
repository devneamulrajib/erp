import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getServiceItems } from '../api/serviceItem';
import {
  getServiceRequisition, getNextServiceRequisitionCode,
  createServiceRequisition, updateServiceRequisition,
} from '../api/serviceRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus, Trash2 } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ServiceRequisitionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [selectedServiceItemId, setSelectedServiceItemId] = useState('');

  const [rows, setRows] = useState([]);
  const [attachmentName, setAttachmentName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    getServiceItems().then(setServiceItems).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextServiceRequisitionCode().then((res) => setCode(res.code || res)).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getServiceRequisition(id).then((r) => {
      setDate(r.date || '');
      setCode(r.code || '');
      setProjectType(r.projectType || '');
      setProject(r.project?.id || r.project || '');
      setTitleOfWork(r.titleOfWork || '');
      setTask(r.task || '');
      setSite(r.site?.id || r.site || '');
      setRows((r.items || []).map((it) => ({
        ...it,
        unit: typeof it.unit === 'object' ? (it.unit?.name || '') : (it.unit || ''),
      })));
    }).catch((err) => {
      console.error(err);
      setError('Failed to load service requisition.');
    });
  }, [id, isEdit]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.qtyDays), 0),
    [rows]
  );

  function addItemRow() {
    // <select> values are always strings; ids coming from Sequelize/MySQL are
    // numeric, so compare as strings on both sides to avoid a silent mismatch.
    const it = serviceItems.find((x) => String(x.id) === String(selectedServiceItemId));
    if (!it) return;
    setRows((prev) => [...prev, {
      serviceItem: it.id,
      boqItem: '',
      date: new Date().toISOString().slice(0, 10),
      code: it.code || '',
      name: it.name,
      // it.unit is the included Unit association ({ name: '...' }), not a plain string — unwrap it.
      unit: it.unit?.name || '',
      qtyDays: 0,
      rate: it.salePrice || 0,
      details: '',
      amount: 0,
    }]);
    setSelectedServiceItemId('');
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
        code, date, projectType, project, titleOfWork, task, site,
        items: rows.map((r) => ({ ...r, amount: num(r.rate) * num(r.qtyDays) })),
        attachment: attachmentName,
      };
      if (isEdit) {
        await updateServiceRequisition(id, payload);
      } else {
        await createServiceRequisition(payload);
      }
      navigate('/requisition-module/service-work-requisition-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save service requisition');
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
            { label: 'Requisition', to: '/requisition-module/service-work-requisition-list' },
            { label: 'Service Requisition' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/requisition-module/service-work-requisition-list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Service Requisition List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
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
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Select Service/Work">
              <div className="flex gap-2">
                <select value={selectedServiceItemId} onChange={(e) => setSelectedServiceItemId(e.target.value)} className="input flex-1">
                  <option value="">Select Item</option>
                  {serviceItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <button type="button" onClick={addItemRow} disabled={!selectedServiceItemId} className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
                  <Plus size={16} />
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['BOQ Items', 'Date', 'Code', 'Name', 'Unit', 'Qty/Days', 'Rate', 'Details', 'Amount', 'Action'].map((h) => (
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
                    <td className="px-2 py-1.5">
                      <input value={r.boqItem} onChange={(e) => updateRow(i, 'boqItem', e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1" placeholder="BOQ item" />
                    </td>
                    <td className="px-2 py-1.5">{r.date}</td>
                    <td className="px-2 py-1.5">{r.code}</td>
                    <td className="px-2 py-1.5">{r.name}</td>
                    <td className="px-2 py-1.5">{r.unit}</td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.qtyDays} onChange={(e) => updateRow(i, 'qtyDays', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={r.rate} onChange={(e) => updateRow(i, 'rate', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={r.details} onChange={(e) => updateRow(i, 'details', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-1.5 font-medium">{(num(r.rate) * num(r.qtyDays)).toLocaleString()}</td>
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

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6 max-w-md ml-auto">
          <div className="space-y-3">
            <Field label="Subtotal">
              <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Grand Total">
              <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
            </Field>
          </div>
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