// client/src/components/DepositWithdrawalForm.jsx
// The "New Deposit / Withdrawal" entry form, shared by the Deposit &
// Withdrawal page and the accountant's workspace (AccountingWorkspace).
// "Save & Post" creates a real Receipt (deposit) or Payment (withdrawal)
// voucher with a Dr and a Cr ledger line (server/routes/depositWithdrawal.js).
// Transaction types use the Office Budget categories: withdrawals can be
// tagged with an office expense category (its default expense head is
// pre-selected), and the deposit type "Receive Cash" is also recorded as
// office-fund cash received. "Save Draft" keeps the form in this browser only.
//
// Props:
//   newSignal   bump this number to clear the form and scroll to it
//   onPosted    (savedRow) => void, called after a successful post
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Save, FileText, RotateCcw, CloudUpload, X, Info, CircleAlert, LoaderCircle, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import {
  getDepositWithdrawalOptions, getNextDepositWithdrawalCode, createDepositWithdrawal,
} from '../api/depositWithdrawal';

export const RECEIVE_CASH = 'Receive Cash';
const OTHER_TYPES = {
  deposit: ['Customer Collection', 'Investor Fund', 'Loan Received', 'Fund Transfer In', 'Other Income'],
  withdrawal: ['Supplier Payment', 'Salary Payment', 'Loan Repayment', 'Fund Transfer Out', 'Other Payment'],
};
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card', 'Mobile Banking (bKash/Nagad)'];
const MAX_FILE = 5 * 1024 * 1024;
const FILE_OK = /\.(jpe?g|png|pdf)$/i;

// One Cobalt Sky look everywhere (tokens live in index.css @theme).
const THEME = {
  input: 'focus:border-cobalt-400 focus:ring-4 focus:ring-cobalt/10',
  tabOn: 'bg-navy text-white shadow-sm',
  primary: 'bg-gold text-navy hover:bg-gold-600',
  drop: 'hover:border-cobalt-300 hover:bg-cobalt-50',
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const taka = (n) => `৳${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const norm = (v) => String(v || '').trim().toLowerCase();

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

const emptyForm = (kind = 'deposit') => ({
  kind,
  transactionType: kind === 'deposit' ? RECEIVE_CASH : '',
  budgetCategory: '',
  receivedFrom: '',
  date: todayStr(),
  description: '',
  account: '',
  ledgerAccount: '',
  counterAccount: '',
  project: '',
  amount: '',
  paymentMethod: 'Cash',
  chequeNo: '',
});

// Chart-of-account id for a name (exact first, then partial).
function chartIdByName(name, chart) {
  const n = norm(name);
  if (!n) return '';
  const exact = chart.find((c) => norm(c.name) === n);
  if (exact) return String(exact.id);
  const partial = chart.find((c) => norm(c.name) && (norm(c.name).includes(n) || n.includes(norm(c.name))));
  return partial ? String(partial.id) : '';
}

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}{required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function DepositWithdrawalForm({ newSignal = 0, onPosted }) {
  const a = THEME;
  const inputClass = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition ${a.input}`;
  const user = useMemo(readUser, []);
  const draftKey = `erp.depositWithdrawal.draft.${user?.id ?? 'me'}`;
  const rootRef = useRef(null);
  const fileRef = useRef(null);

  const [options, setOptions] = useState({ accounts: [], chartOfAccounts: [], projects: [], budgetCategories: [], accountDefaults: {} });
  const [form, setForm] = useState(() => emptyForm());
  const [voucherNo, setVoucherNo] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [postedCount, setPostedCount] = useState(0);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadOptions = () =>
    getDepositWithdrawalOptions()
      .then((d) => setOptions({ budgetCategories: [], accountDefaults: {}, ...d }))
      .catch((err) => setFormError(err.response?.data?.message || 'Failed to load accounts'));

  useEffect(() => { loadOptions(); }, []);

  // Voucher ID preview for the chosen tab (refreshed after each post).
  useEffect(() => {
    let alive = true;
    getNextDepositWithdrawalCode(form.kind)
      .then((d) => { if (alive) setVoucherNo(d.code); })
      .catch(() => { if (alive) setVoucherNo(''); });
    return () => { alive = false; };
  }, [form.kind, postedCount]);

  // Restore a saved draft once.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (saved && typeof saved === 'object') {
        setForm({ ...emptyForm(saved.kind === 'withdrawal' ? 'withdrawal' : 'deposit'), ...saved });
        setNotice('Your saved draft was restored. It is not posted yet.');
      }
    } catch { /* ignore broken draft */ }
  }, [draftKey]);

  // "New Transaction" from the parent: clear and bring the form into view.
  useEffect(() => {
    if (!newSignal) return;
    resetForm(form.kind);
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSignal]);

  const chart = useMemo(() => options.chartOfAccounts || [], [options.chartOfAccounts]);
  const categories = useMemo(() => options.budgetCategories || [], [options.budgetCategories]);
  const chartOptions = useMemo(
    () => chart.map((c) => ({ value: String(c.id), label: c.code ? `${c.name} (${c.code})` : c.name })),
    [chart],
  );
  const topCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  // Office expense categories as "Parent › Sub", parents first.
  const categoryChoices = useMemo(() => {
    const out = [];
    topCategories.forEach((p) => {
      out.push({ id: p.id, label: p.name });
      categories.filter((c) => c.parentId === p.id).forEach((s) => out.push({ id: s.id, label: `${p.name} › ${s.name}` }));
    });
    return out;
  }, [categories, topCategories]);

  const accountOptions = options.accounts || [];
  const selectedAccount = accountOptions.find((x) => String(x.id) === String(form.account));
  const isDeposit = form.kind === 'deposit';
  const isReceiveCash = isDeposit && form.transactionType === RECEIVE_CASH;
  const typeValue = form.budgetCategory && !isDeposit ? `cat:${form.budgetCategory}` : form.transactionType;

  function chooseAccount(id) {
    const acc = accountOptions.find((x) => String(x.id) === String(id));
    const defaults = options.accountDefaults || {};
    const byName = acc ? chartIdByName(acc.name, chart) : '';
    const byDefault = acc ? chartIdByName(acc.accountType === 'Cash' ? defaults.cashAccount : defaults.bankAccount, chart) : '';
    setForm((f) => ({ ...f, account: id, ledgerAccount: byName || byDefault || f.ledgerAccount }));
  }

  function chooseType(value) {
    if (value.startsWith('cat:')) {
      const id = Number(value.slice(4));
      const cat = categories.find((c) => c.id === id);
      const parent = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : null;
      const label = categoryChoices.find((c) => c.id === id)?.label || cat?.name || '';
      const head = chartIdByName(cat?.defaultDrAccount || parent?.defaultDrAccount, chart);
      setForm((f) => ({ ...f, transactionType: label, budgetCategory: String(id), counterAccount: head || f.counterAccount }));
      return;
    }
    setForm((f) => ({ ...f, transactionType: value, budgetCategory: value === RECEIVE_CASH ? f.budgetCategory : '' }));
  }

  function switchKind(kind) {
    setForm((f) => ({ ...f, kind, transactionType: kind === 'deposit' ? RECEIVE_CASH : '', budgetCategory: '' }));
    setFormError('');
  }

  function pickFile(f) {
    setFormError('');
    if (!f) { setFile(null); return; }
    if (!FILE_OK.test(f.name)) { setFormError('Attachment must be JPG, PNG or PDF'); return; }
    if (f.size > MAX_FILE) { setFormError('Attachment must be 5MB or smaller'); return; }
    setFile(f);
  }

  function resetForm(kind = form.kind) {
    setForm(emptyForm(kind));
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setFormError('');
    setNotice('');
    localStorage.removeItem(draftKey);
  }

  function saveDraft() {
    localStorage.setItem(draftKey, JSON.stringify(form));
    setFormError('');
    setNotice(`Draft saved on this device${file ? ' (attach the file again before posting)' : ''}. It is not posted to the ledger.`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setNotice('');
    const missing = [];
    if (!form.transactionType) missing.push('Transaction Type');
    if (!form.date) missing.push('Date');
    if (!form.description.trim()) missing.push('Reference/Description');
    if (!form.account) missing.push('Account');
    if (!form.ledgerAccount) missing.push('Ledger Head');
    if (!form.counterAccount) missing.push(isDeposit ? 'Received From' : 'Paid To');
    if (!(Number(form.amount) > 0)) missing.push('Amount');
    if (!form.paymentMethod) missing.push('Payment Method');
    if (missing.length) {
      setFormError(`Please fill: ${missing.join(', ')}`);
      return;
    }
    if (form.ledgerAccount === form.counterAccount) {
      setFormError('Ledger head and counter account must be different');
      return;
    }
    setSaving(true);
    try {
      const saved = await createDepositWithdrawal({ ...form, attachmentFile: file });
      resetForm(form.kind);
      setPostedCount((n) => n + 1);
      setNotice(`${saved.voucherNo} saved and posted to the ledger${isReceiveCash ? ' (also added to Office Budget cash received)' : ''}.`);
      loadOptions();
      onPosted?.(saved);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={rootRef} onSubmit={handleSubmit} className="scroll-mt-24 space-y-4" noValidate>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {[
          { value: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
          { value: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => switchKind(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              form.kind === o.value ? a.tabOn : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <o.icon className="size-4" /> {o.label}
          </button>
        ))}
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <CircleAlert size={16} className="shrink-0" /> {formError}
        </div>
      )}
      {notice && !formError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="text-amber-700 hover:text-amber-900"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Transaction Type" required>
          <select value={typeValue} onChange={(e) => chooseType(e.target.value)} className={inputClass}>
            <option value="">Select type</option>
            {isDeposit ? (
              <>
                <optgroup label="Office Budget">
                  <option value={RECEIVE_CASH}>{RECEIVE_CASH}</option>
                </optgroup>
                <optgroup label="Other">
                  {OTHER_TYPES.deposit.map((t) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              </>
            ) : (
              <>
                {categoryChoices.length > 0 && (
                  <optgroup label="Office Expense Categories">
                    {categoryChoices.map((c) => <option key={c.id} value={`cat:${c.id}`}>{c.label}</option>)}
                  </optgroup>
                )}
                <optgroup label="Other">
                  {OTHER_TYPES.withdrawal.map((t) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              </>
            )}
          </select>
        </Field>
        <Field label="Date" required>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
        </Field>
      </div>

      {isReceiveCash && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Office Category">
            <select value={form.budgetCategory} onChange={(e) => set('budgetCategory', e.target.value)} className={inputClass}>
              <option value="">General office fund (all categories)</option>
              {topCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Received From (person)">
            <input value={form.receivedFrom} onChange={(e) => set('receivedFrom', e.target.value)} placeholder="Management" className={inputClass} />
          </Field>
        </div>
      )}

      <Field label="Reference / Description" required>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={isDeposit ? 'e.g. Cash received for office expenses' : 'e.g. Paid for office supplies'}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account" required>
          <select value={form.account} onChange={(e) => chooseAccount(e.target.value)} className={inputClass}>
            <option value="">Select Cash / Bank / MFS account</option>
            {accountOptions.map((x) => (
              <option key={x.id} value={x.id}>{x.name} ({x.accountType})</option>
            ))}
          </select>
          {selectedAccount && (
            <p className="mt-1 text-[11px] text-slate-500">Current balance: <span className="font-semibold text-slate-900">{taka(selectedAccount.balance)}</span></p>
          )}
        </Field>
        <Field label="Project">
          <select value={form.project} onChange={(e) => set('project', e.target.value)} className={inputClass}>
            <option value="">Select Project (optional)</option>
            {(options.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ledger Head (Cash / Bank)" required>
          <SearchableSelect options={chartOptions} value={form.ledgerAccount} onChange={(v) => set('ledgerAccount', v ?? '')} placeholder="Chart of account for this account" />
        </Field>
        <Field label={isDeposit ? 'Received From (Credit Head)' : 'Paid To (Debit Head)'} required>
          <SearchableSelect options={chartOptions} value={form.counterAccount} onChange={(v) => set('counterAccount', v ?? '')} placeholder="Select chart of account" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Voucher ID">
          <input value={voucherNo || 'Auto generated'} readOnly className={`${inputClass} cursor-not-allowed bg-slate-50 font-mono text-slate-500`} />
        </Field>
        <Field label="Amount (৳)" required>
          <input
            type="number" min="0" step="0.01" inputMode="decimal"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
            className={`${inputClass} text-right`}
          />
        </Field>
        <Field label="Payment Method" required>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={inputClass}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      {form.paymentMethod === 'Cheque' && (
        <Field label="Cheque No">
          <input value={form.chequeNo} onChange={(e) => set('chequeNo', e.target.value)} className={inputClass} placeholder="Cheque number" />
        </Field>
      )}

      <Field label="Attachment (Optional)">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center transition-colors ${a.drop}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
        >
          <CloudUpload size={24} className="text-slate-400" />
          {file ? (
            <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <FileText size={14} /> {file.name}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); pickFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="text-rose-600"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <>
              <span className="text-sm font-semibold text-slate-700">Upload Receipt / Bank Slip</span>
              <span className="text-[11px] text-slate-500">(JPG, PNG, PDF - Max 5MB)</span>
            </>
          )}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
      </Field>

      <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => resetForm()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RotateCcw size={15} /> Reset
        </button>
        <button type="button" onClick={saveDraft} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <FileText size={15} /> Save Draft
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 ${a.primary}`}
        >
          {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Posting...' : 'Save & Post'}
        </button>
      </div>
    </form>
  );
}
