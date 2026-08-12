import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { getExpense, getNextExpenseCode, createExpense, updateExpense } from '../api/expense';
import { getChartOfAccounts } from '../api/chartOfAccounts';

export default function ExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);

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

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    getChartOfAccounts().then((res) => setAccounts(res.data)).catch(() => {});
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Expense' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/accounts-module/expense_list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Expense List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </Field>
            <Field label="Reference">
              <input value={reference} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Project">
              <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" placeholder="e.g. Materials Carrying" />
            </Field>
            <Field label="Debit Account" required>
              <select value={drAccount} onChange={(e) => setDrAccount(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {accounts.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Credit Account" required>
              <select value={crAccount} onChange={(e) => setCrAccount(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {accounts.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Amount" required>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Amount" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="input" />
            </Field>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-10 py-2.5 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
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