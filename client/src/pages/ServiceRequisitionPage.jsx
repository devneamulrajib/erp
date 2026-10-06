import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getServiceItems } from '../api/serviceItem';
import {
  getServiceRequisition,
  getNextServiceRequisitionCode,
  createServiceRequisition,
  updateServiceRequisition,
} from '../api/serviceRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  Plus,
  Trash2,
  X,
  Save,
  Send,
  Paperclip,
  ClipboardList,
  AlertCircle,
  Building2,
  Calendar,
  Briefcase,
  Layers,
  MapPin,
  CheckCircle2,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';

const SUPPLIER_ENDPOINT = '/chart-of-accounts';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  return num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function asList(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ServiceRequisitionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [date, setDate] = useState(today());
  const [code, setCode] = useState('');
  const [project, setProject] = useState('');
  const [projectType, setProjectType] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [site, setSite] = useState('');
  const [task, setTask] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [supplier, setSupplier] = useState('');
  const [selectedServiceItemId, setSelectedServiceItemId] = useState('');

  const [rows, setRows] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [discount, setDiscount] = useState('');
  const [vatPercent, setVatPercent] = useState('');

  const [savingAs, setSavingAs] = useState('');
  const [error, setError] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(asList(res))).catch(() => {});
    api.get('/sites').then((res) => setSites(asList(res))).catch(() => {});
    getServiceItems().then(setServiceItems).catch(() => {});
    api.get(SUPPLIER_ENDPOINT).then((res) => setSuppliers(asList(res))).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextServiceRequisitionCode().then((res) => setCode(res.code || res)).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getServiceRequisition(id)
      .then((r) => {
        setDate((r.date || today()).slice(0, 10));
        setCode(r.code || '');
        setProject(r.projectId ? String(r.projectId) : '');
        setProjectType(r.projectType || '');
        setTitleOfWork(r.titleOfWork || '');
        setSite(r.siteId ? String(r.siteId) : '');
        setTask(r.task || '');
        setRequiredByDate((r.requiredByDate || '').slice(0, 10));
        setPriority(r.priority || 'normal');
        setSupplier(r.supplierId ? String(r.supplierId) : '');
        setRemarks(r.remarks || '');
        setAttachments(Array.isArray(r.attachment) ? r.attachment : r.attachment ? [r.attachment] : []);
        setDiscount(r.discount ? String(r.discount) : '');
        setVatPercent(r.vatPercent ? String(r.vatPercent) : '');
        setIsDraft(r.status === 'draft');
        setRows(
          (r.items || []).map((it) => ({
            ...it,
            serviceItem: it.serviceItemId || it.serviceItem,
            unit: typeof it.unit === 'object' ? it.unit?.name || '' : it.unit || '',
          }))
        );
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load service requisition.');
      });
  }, [id, isEdit]);

  function handleProjectChange(value) {
    setProject(value);
    setSite('');
    const p = projects.find((x) => String(x.id) === String(value));
    const type = p?.projectType?.name || p?.projectType || p?.projectTypeName || '';
    setProjectType(typeof type === 'string' ? type : '');
  }

  const visibleSites = useMemo(() => {
    if (!project) return sites;
    return sites.filter((s) => !s.projectId || String(s.projectId) === String(project));
  }, [sites, project]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + num(r.rate) * num(r.qtyDays), 0),
    [rows]
  );
  const discountValue = Math.min(Math.max(num(discount), 0), subtotal);
  const taxable = subtotal - discountValue;
  const vatAmount = (taxable * Math.max(num(vatPercent), 0)) / 100;
  const grandTotal = taxable + vatAmount;

  function addItemRow() {
    const it = serviceItems.find((x) => String(x.id) === String(selectedServiceItemId));
    if (!it) return;
    setRows((prev) => [
      ...prev,
      {
        serviceItem: it.id,
        boqItem: '',
        date,
        code: it.code || '',
        name: it.name,
        unit: it.unit?.name || it.unit || 'Unit',
        qtyDays: 1,
        rate: it.salePrice || 0,
        details: '',
        amount: it.salePrice || 0,
      },
    ]);
    setSelectedServiceItemId('');
  }

  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleFiles(e) {
    const names = Array.from(e.target.files || []).map((f) => f.name);
    setAttachments((prev) => Array.from(new Set([...prev, ...names])));
    e.target.value = '';
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((n) => n !== name));
  }

  async function save(status) {
    setError('');

    if (status === 'submitted') {
      if (!project) return setError('Please select a project.');
      if (!titleOfWork.trim()) return setError('Please enter the title/name of work.');
      if (!requiredByDate) return setError('Please set the required-by date.');
      if (rows.length === 0) return setError('Please add at least one service item.');
      if (!rows.some((r) => num(r.qtyDays) > 0)) {
        return setError('At least one item needs a quantity greater than zero.');
      }
    }

    if (requiredByDate && requiredByDate < date) {
      return setError('Required-by date cannot be before the requisition date.');
    }

    setSavingAs(status);
    try {
      const payload = {
        code,
        date,
        project,
        projectType,
        titleOfWork,
        task,
        site,
        supplier,
        requiredByDate,
        priority,
        remarks,
        discount: num(discount),
        vatPercent: num(vatPercent),
        items: rows.map((r) => ({ ...r, date, amount: num(r.rate) * num(r.qtyDays) })),
        attachment: attachments,
        status,
      };

      if (isEdit) {
        await updateServiceRequisition(id, payload);
      } else {
        await createServiceRequisition(payload);
      }
      navigate('/requisition-module/service-work-requisition-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save requisition');
    } finally {
      setSavingAs('');
    }
  }

  const busy = savingAs !== '';

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-28">
      <Topbar />

      <form onSubmit={(e) => { e.preventDefault(); save('submitted'); }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Requisition', to: '/requisition-module/service-work-requisition-list' },
                { label: isEdit ? 'Edit Requisition' : 'Create New' },
              ]}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isEdit ? (isDraft ? 'Edit Draft Requisition' : 'Edit Service Requisition') : 'New Service Requisition'}
              </h1>
              {code && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {code}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/requisition-module/service-work-requisition-list')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            View All Requisitions
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-red-50/90 border border-red-200 rounded-xl text-sm text-red-700 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {isDraft && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Info className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span>This is an unsubmitted <strong>Draft</strong>. Changes will not be sent for approval until submitted.</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* General Project & Scope Info */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-800">Project & Schedule</h2>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={project}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Project Type
                  </label>
                  <input
                    value={projectType}
                    readOnly
                    placeholder="Auto-detected"
                    className="w-full text-sm rounded-lg border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Title / Scope of Work <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={titleOfWork}
                    onChange={(e) => setTitleOfWork(e.target.value)}
                    placeholder="e.g. Electrical Conduit Laying - Tower 2"
                    required
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Site Location
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    disabled={!project}
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{project ? 'Select Site' : 'Select Project First'}</option>
                    {visibleSites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Task / Milestone
                  </label>
                  <input
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Optional milestone name"
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Requisition Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Required By Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={requiredByDate}
                    min={date}
                    onChange={(e) => setRequiredByDate(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Service Items Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-slate-800">
                    Service Items ({rows.length})
                  </h2>
                </div>

                {/* Add Item Bar */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedServiceItemId}
                    onChange={(e) => setSelectedServiceItemId(e.target.value)}
                    className="text-xs sm:text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-xs"
                  >
                    <option value="">Select Service / Work item...</option>
                    {serviceItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code ? `${it.code} – ${it.name}` : it.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={!selectedServiceItemId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-3 w-32">BOQ Ref</th>
                      <th className="py-3 px-3 w-20 text-center">Unit</th>
                      <th className="py-3 px-3 w-24">Qty/Days</th>
                      <th className="py-3 px-3 w-28">Rate</th>
                      <th className="py-3 px-3 w-32 text-right">Amount</th>
                      <th className="py-3 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                          <p className="text-sm font-medium text-slate-500">No items added yet</p>
                          <p className="text-xs text-slate-400">Select a service item above to populate requisition list.</p>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="py-3 px-4 align-top">
                            <div className="font-medium text-slate-800">{row.name}</div>
                            {row.code && <span className="text-[11px] font-mono text-slate-400">{row.code}</span>}
                            <input
                              type="text"
                              placeholder="Notes / instructions..."
                              value={row.details || ''}
                              onChange={(e) => updateRow(i, 'details', e.target.value)}
                              className="mt-1.5 w-full text-xs text-slate-600 placeholder:text-slate-300 border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-indigo-500 focus:ring-0 p-0 bg-transparent"
                            />
                          </td>
                          <td className="py-3 px-3 align-top">
                            <input
                              type="text"
                              value={row.boqItem || ''}
                              onChange={(e) => updateRow(i, 'boqItem', e.target.value)}
                              placeholder="e.g. 2.1"
                              className="w-full text-xs rounded-md border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-center align-middle font-medium text-xs text-slate-500">
                            {row.unit}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <input
                              type="number"
                              min="0"
                              value={row.qtyDays}
                              onChange={(e) => updateRow(i, 'qtyDays', e.target.value)}
                              className="w-full text-sm font-medium rounded-md border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-right"
                            />
                          </td>
                          <td className="py-3 px-3 align-top">
                            <input
                              type="number"
                              min="0"
                              value={row.rate}
                              onChange={(e) => updateRow(i, 'rate', e.target.value)}
                              className="w-full text-sm rounded-md border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-right"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-800 align-top pt-4">
                            {fmt(num(row.rate) * num(row.qtyDays))}
                          </td>
                          <td className="py-3 px-3 text-center align-top pt-3.5">
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scope Remarks */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Special Remarks / Terms
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Include key execution conditions, penalties, or compliance details here..."
                className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right Column: Settings & Summary */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Preferences & Priority */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      priority === 'normal'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      priority === 'urgent'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Preferred Contractor (Optional)
                </label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                >
                  <option value="">No preference / Open Tender</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 pb-3 border-b border-slate-100">
                Payment Summary
              </h3>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-800">{fmt(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Discount Amount</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 text-right text-xs rounded-md border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">VAT (%)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0%"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(e.target.value)}
                    className="w-24 text-right text-xs rounded-md border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {discountValue > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Discounted Net</span>
                    <span>{fmt(taxable)}</span>
                  </div>
                )}

                {vatAmount > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Calculated Tax</span>
                    <span>+{fmt(vatAmount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-900">Estimated Total</span>
                  <span className="text-2xl font-bold tracking-tight text-indigo-600">
                    {fmt(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Attachments
              </label>
              
              <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mb-1" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-indigo-600">Upload documents or plans</span>
                <span className="text-[10px] text-slate-400">PDF, images up to 10MB</span>
                <input type="file" multiple onChange={handleFiles} className="hidden" />
              </label>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {attachments.map((file) => (
                    <div
                      key={file}
                      className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 text-slate-700"
                    >
                      <span className="truncate max-w-[200px]">{file}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file)}
                        className="text-slate-400 hover:text-rose-500 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-3.5 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <span>{rows.length} Items Listed</span>
              <span className="text-slate-300">•</span>
              <span>Total: <strong className="text-slate-900 font-semibold">{fmt(grandTotal)}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => save('draft')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4 text-slate-400" />
                {savingAs === 'draft' ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/30"
              >
                <Send className="w-4 h-4" />
                {savingAs === 'submitted' ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}