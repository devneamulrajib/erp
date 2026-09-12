import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers } from '../api/customer';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import {
  getPeriodBill, getNextPeriodBillCode,
  createPeriodBill, updatePeriodBill, uploadPeriodBillAttachment,
} from '../api/periodBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ListChecks, Upload } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
// MySQL rows use `id`; fall back to `_id` only if present. Never falls back to name/text.
function rid(o) {
  return o?.id ?? o?._id ?? '';
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";

export default function PeriodBillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [sites, setSites] = useState([]);
  const [projects, setProjects] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState('');
  const [ledger, setLedger] = useState('');
  const [code, setCode] = useState('');
  const [site, setSite] = useState('');
  const [refWoNo, setRefWoNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [project, setProject] = useState('');
  const [projectCost, setProjectCost] = useState('');
  const [percentage, setPercentage] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState('');
  const [contentBody, setContentBody] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {});
    getChartOfAccounts().then((res) => setLedgers(res.data || res)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextPeriodBillCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getPeriodBill(id).then((b) => {
      setDate(b.date || '');
      setCustomer(rid(b.customer));
      setLedger(rid(b.ledger));
      setCode(b.code || '');
      setSite(rid(b.site));
      setRefWoNo(b.refWoNo || '');
      setStartDate(b.startDate || '');
      setEndDate(b.endDate || '');
      setProject(rid(b.project));
      setProjectCost(b.projectCost || '');
      setPercentage(b.percentage || '');
      setContentBody(b.contentBody || '');
      setExistingAttachment(b.attachment || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load period bill.');
    });
  }, [id, isEdit]);

  const constructionCost = useMemo(
    () => num(projectCost) * (num(percentage) / 100),
    [projectCost, percentage]
  );
  const grandTotal = constructionCost;

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
        code, date, customer, ledger: ledger || null, site: site || null, refWoNo,
        startDate, endDate, project: project || null, projectCost, percentage,
        contentBody,
      };

      const result = isEdit
        ? await updatePeriodBill(id, payload)
        : await createPeriodBill(payload);

      if (attachmentFile) {
        await uploadPeriodBillAttachment(isEdit ? id : result.id, attachmentFile);
      }

      navigate('/billing/percentage_bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save period bill');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/percentage_bill_list' },
                { label: 'Period Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Period Bill' : 'New Period Bill'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Create a periodic construction bill for a project</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/billing/percentage_bill_list')}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-teal-600/20 transition-colors"
          >
            <ListChecks size={16} strokeWidth={2.5} />
            Period Billing List
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* Details panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Customer" required>
                <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls}>
                  <option value="">Select value</option>
                  {customers.map((c) => <option key={rid(c)} value={rid(c)}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ledger">
                <select value={ledger} onChange={(e) => setLedger(e.target.value)} className={inputCls}>
                  <option value="">Select Ledger</option>
                  {ledgers.map((l) => <option key={rid(l)} value={rid(l)}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
                </select>
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono`} />
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={rid(s)} value={rid(s)}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Ref W/O No.">
                <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className={inputCls} placeholder="PO No." />
              </Field>
              <Field label="Start Date">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Date">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
                  <option value="">Select value</option>
                  {projects.map((p) => <option key={rid(p)} value={rid(p)}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Project Cost">
                <input type="number" value={projectCost} onChange={(e) => setProjectCost(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Percentage">
                <input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} className={inputCls} placeholder="%" />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className={`${inputCls} bg-slate-50 text-slate-700 font-semibold`} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Attachment">
                <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-500 cursor-pointer hover:bg-slate-50 transition">
                  <Upload size={14} className="text-slate-400" />
                  <span className="truncate">{attachmentName || 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files ? e.target.files[0] : null;
                      setAttachmentFile(f);
                      setAttachmentName(f ? f.name : '');
                    }}
                  />
                </label>
                {(!attachmentName && existingAttachment) ? (
                  <a href={existingAttachment} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                    View current file
                  </a>
                ) : null}
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Content Body">
                <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={5} className={`${inputCls} w-full resize-none`} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}