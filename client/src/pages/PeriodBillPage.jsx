import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getCustomers } from '../api/customer';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import {
  getPeriodBill, getNextPeriodBillCode,
  createPeriodBill, updatePeriodBill,
} from '../api/periodBill';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
      setCustomer(b.customer?._id || b.customer || '');
      setLedger(b.ledger?._id || b.ledger || '');
      setCode(b.code || '');
      setSite(b.site?._id || b.site || '');
      setRefWoNo(b.refWoNo || '');
      setStartDate(b.startDate || '');
      setEndDate(b.endDate || '');
      setProject(b.project?._id || b.project || '');
      setProjectCost(b.projectCost || '');
      setPercentage(b.percentage || '');
      setContentBody(b.contentBody || '');
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
        code, date, customer, ledger, site, refWoNo,
        startDate, endDate, project, projectCost, percentage,
        attachment: attachmentName, contentBody,
      };
      if (isEdit) {
        await updatePeriodBill(id, payload);
      } else {
        await createPeriodBill(payload);
      }
      navigate('/billing/percentage_bill_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save period bill');
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
            { label: 'Billing', to: '/billing/percentage_bill_list' },
            { label: 'Period Bill List' },
          ]}
        />
        <button type="button" onClick={() => navigate('/billing/percentage_bill_list')}
          className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-md">
          Period Billing List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="Customer" required>
            <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="input">
              <option value="">Select value</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ledger">
            <select value={ledger} onChange={(e) => setLedger(e.target.value)} className="input">
              <option value="">Select Ledger</option>
              {ledgers.map((l) => <option key={l._id} value={l._id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
            </select>
          </Field>
          <Field label="Code">
            <input value={code} readOnly className="input bg-gray-50" />
          </Field>
          <Field label="Site">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Ref W/O No.">
            <input value={refWoNo} onChange={(e) => setRefWoNo(e.target.value)} className="input" placeholder="PO No." />
          </Field>
          <Field label="Start Date">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </Field>
          <Field label="End Date">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </Field>
          <Field label="Project">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
              <option value="">Select value</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Project Cost">
            <input type="number" value={projectCost} onChange={(e) => setProjectCost(e.target.value)} className="input" />
          </Field>
          <Field label="Percentage">
            <input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="input" placeholder="%" />
          </Field>
          <Field label="Grand Total">
            <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
          </Field>
        </div>

        <Field label="Attachment">
          <input type="file" onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')} className="input" />
        </Field>

        <Field label="Content Body">
          <textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} rows={5} className="input w-full mt-1" />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50 mt-4"
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