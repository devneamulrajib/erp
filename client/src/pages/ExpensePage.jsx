import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getExpense, getNextExpenseCode, createExpense, updateExpense } from '../api/expense';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getCategories } from '../api/category';

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

export default function ExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data ?? [])).catch(() => {});
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => {});
    getCategories().then((res) => setCategories(res ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextExpenseCode().then(setReference).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getExpense(id).then((e) => {
      setProject(e.project || '');
      setCategory(e.category || '');
      setDrAccount(e.drAccount || '');
      setCrAccount(e.crAccount || '');
      setAmount(e.amount ?? '');
      setReference(e.reference || '');
      setDate(e.date ? new Date(e.date).toISOString().slice(0, 10) : '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load expense.');
    });
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarning('');
    if (!drAccount || !crAccount || !amount) {
      setError('Debit Account, Credit Account and Amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { project, category, drAccount, crAccount, amount, reference, date, attachmentFile };
      if (isEdit) {
        await updateExpense(id, payload);
      } else {
        await createExpense(payload);
      }
      navigate('/accounts-module/expense_list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save expense');
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
                { label: 'Accounts Module', to: '/dashboard' },
                { label: 'Expense' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Expense' : 'New Expense'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Record a debit and credit entry against a project</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts-module/expense_list')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            Expense List
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}
          {warning && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3 mb-5">{warning}</div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Reference">
                <input value={reference} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <div />
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <Field label="Debit Account" required>
                <select value={drAccount} onChange={(e) => setDrAccount(e.target.value)} className={inputClass}>
                  <option value="">Select Chart Of Account</option>
                  {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Credit Account" required>
                <select value={crAccount} onChange={(e) => setCrAccount(e.target.value)} className={inputClass}>
                  <option value="">Select Chart Of Account</option>
                  {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Amount" required>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder="Amount" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Field label="Attachment">
                <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className={inputClass} />
              </Field>
              <div />
            </div>

            <div className="flex justify-center pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-10 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}