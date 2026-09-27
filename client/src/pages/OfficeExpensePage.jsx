import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Wallet, ScrollText, Info, Pencil } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import {
  getOfficeExpense, getNextOfficeExpenseCode, createOfficeExpense, updateOfficeExpense,
} from '../api/officeExpense';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getBudgetCategories } from '../api/budgetCategory';

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

export default function OfficeExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const isViewMode = isEdit && searchParams.get('mode') === 'view';

  const [accounts, setAccounts] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);

  const [title, setTitle] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [status, setStatus] = useState('');
  const [addedBy, setAddedBy] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => {});
    getBudgetCategories().then(setBudgetCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextOfficeExpenseCode().then(setReference).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getOfficeExpense(id).then((e) => {
      setTitle(e.title || '');
      setBudgetCategory(e.budgetCategoryId || e.budgetCategory?.id || '');
      setDrAccount(e.drAccount || '');
      setCrAccount(e.crAccount || '');
      setAmount(e.amount ?? '');
      setReference(e.reference || '');
      setDate(e.date ? new Date(e.date).toISOString().slice(0, 10) : '');
      setAttachmentUrl(e.attachment || '');
      setStatus(e.status || '');
      setAddedBy(e.addedBy || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load office expense.');
    });
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarning('');
    if (!budgetCategory) {
      setError('Office Budget Category is required');
      return;
    }
    if (!drAccount || !crAccount || !amount) {
      setError('Debit Account, Credit Account and Amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { title, budgetCategory, drAccount, crAccount, amount, reference, date, attachmentFile };
      let result;
      if (isEdit) {
        result = await updateOfficeExpense(id, payload);
      } else {
        result = await createOfficeExpense(payload);
      }
      if (result?.budgetWarning) {
        window.alert(result.budgetWarning);
      }
      navigate('/accounts-module/office-expense-list');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save office expense');
    } finally {
      setSubmitting(false);
    }
  }

  const budgetCategoryName = budgetCategories.find(
    (c) => String(c.id) === String(budgetCategory)
  )?.name || '-';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/dashboard' },
                { label: 'Office Budget', to: '/accounts-module/office-budget' },
                { label: isViewMode ? 'View Office Expense' : isEdit ? 'Edit Office Expense' : 'Office Expense' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isViewMode ? 'Office Expense Details' : isEdit ? 'Edit Office Expense' : 'New Office Expense'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isViewMode ? 'Read-only summary of this office expense record' : 'Record spending against an office budget category'}
            </p>
          </div>
          <div className="flex gap-2">
            {isViewMode && (
              <button
                type="button"
                onClick={() => navigate(`/accounts-module/office-expense/${id}`)}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                <Pencil size={15} />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-expense-list')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              Office Expense List
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}
        {warning && (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3 mb-5">{warning}</div>
        )}

        {isViewMode ? (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ViewField label="Date" value={date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />
                <ViewField label="Reference" value={reference} mono />
                <ViewField label="Title / Description" value={title || '-'} />
                <ViewField label="Status" value={status} capitalize />
                <ViewField label="Added By" value={addedBy || '-'} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800">Budget Tracking</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ViewField label="Office Budget Category" value={budgetCategoryName} />
                <ViewField label="Amount" value={Number(amount || 0).toFixed(2)} mono />
                <div>
                  <label className={labelClass}>Attachment</label>
                  {attachmentUrl ? (
                    <a href={resolveFileUrl(attachmentUrl)} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                      View attachment
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">-</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <ScrollText size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800">Accounting Entry</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ViewField label="Debit Account" value={drAccount} />
                <ViewField label="Credit Account" value={crAccount} />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Reference">
                  <input value={reference} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
                </Field>
                <Field label="Title / Description">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Monthly electricity bill" />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
              <div className="flex items-start gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Budget Tracking</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Which office budget limit this expense counts against. This is checked against the allocation you set on the Office Budget Tracker page.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Office Budget Category" required>
                  <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)} className={inputClass}>
                    <option value="">Select Category</option>
                    {budgetCategories.filter((c) => !c.parentId).map((top) => (
                      <optgroup key={top.id} label={top.name}>
                        <option value={top.id}>{top.name}</option>
                        {budgetCategories.filter((c) => c.parentId === top.id).map((sub) => (
                          <option key={sub.id} value={sub.id}>— {sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Amount" required>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder="Amount" />
                </Field>
                <Field label="Attachment">
                  <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className={inputClass} />
                  {attachmentUrl && !attachmentFile && (
                    <p className="text-xs text-slate-400 mt-1">
                      Current: <a href={resolveFileUrl(attachmentUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">view file</a>
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
              <div className="flex items-start gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <ScrollText size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Accounting Entry</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separate from the budget limit above — this is the double-entry bookkeeping that posts this expense into your Trial Balance, General Ledger and Balance Sheet.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Debit Account"
                  required
                  hint="The expense account being charged (e.g. Utilities Expense, Office Supplies)."
                >
                  <select value={drAccount} onChange={(e) => setDrAccount(e.target.value)} className={inputClass}>
                    <option value="">Select Chart Of Account</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </Field>
                <Field
                  label="Credit Account"
                  required
                  hint="Where the money came from (e.g. Cash, Bank Account)."
                >
                  <select value={crAccount} onChange={(e) => setCrAccount(e.target.value)} className={inputClass}>
                    <option value="">Select Chart Of Account</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-10 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : isEdit ? 'Update' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <label className={labelClass.replace('mb-1.5', '')}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="text-slate-300 hover:text-indigo-500 transition-colors"
          >
            <Info size={12} />
          </button>
        )}
      </div>
      {hint && showHint && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-2 mb-2">{hint}</p>
      )}
      {children}
    </div>
  );
}

function ViewField({ label, value, mono, capitalize }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}