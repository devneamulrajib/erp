import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Pencil,
  Paperclip,
  Check,
  AlertCircle,
  X,
  Wallet,
  Building,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  ArrowLeft,
  PlusCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import {
  getOfficeExpense,
  getOfficeExpenses,
  getNextOfficeExpenseCode,
  getOfficeExpenseBudgetStatus,
  createOfficeExpense,
  updateOfficeExpense,
} from '../api/officeExpense';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getBudgetCategories } from '../api/budgetCategory';

const METHODS = [
  { id: 'Cash', label: 'Cash', icon: Wallet },
  { id: 'Bank', label: 'Bank Transfer', icon: Building },
  { id: 'Cheque', label: 'Cheque', icon: CreditCard },
];

const LAST_METHOD_KEY = 'officeExpense:lastMethod';
const LAST_CREDIT_KEY = 'officeExpense:lastCreditByMethod';

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

// ---------- helpers ----------

function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable, ignore */
  }
}

function readLastCredits() {
  try {
    return JSON.parse(readStore(LAST_CREDIT_KEY, '{}')) || {};
  } catch {
    return {};
  }
}

const money = (v) =>
  Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (v) =>
  Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 });

function accountsForMethod(method, accounts) {
  if (!method) return accounts;
  const pattern = method === 'Cash' ? /cash/i : /bank/i;
  return accounts.filter((a) => pattern.test(a.name || ''));
}

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below100(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

function below1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ');
}

function amountInWords(value) {
  const n = Math.round(Number(value) * 100) / 100;
  if (!n || n < 0 || n >= 1e9) return '';
  let taka = Math.floor(n);
  const paisa = Math.round((n - taka) * 100);

  const crore = Math.floor(taka / 10000000);
  taka %= 10000000;
  const lakh = Math.floor(taka / 100000);
  taka %= 100000;
  const thousand = Math.floor(taka / 1000);
  taka %= 1000;

  const parts = [];
  if (crore) parts.push(`${below1000(crore)} crore`);
  if (lakh) parts.push(`${below100(lakh)} lakh`);
  if (thousand) parts.push(`${below100(thousand)} thousand`);
  if (taka) parts.push(below1000(taka));

  let words = parts.join(' ');
  if (words) words += ' taka';
  if (paisa) words += `${words ? ' and ' : ''}${below100(paisa)} paisa`;
  if (!words) return '';
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
}

// ---------- component ----------

export default function OfficeExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const isViewMode = isEdit && searchParams.get('mode') === 'view';

  const [accounts, setAccounts] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [lastDrByCategory, setLastDrByCategory] = useState({});

  const [title, setTitle] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(todayStr());
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [status, setStatus] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [drTouched, setDrTouched] = useState(false);
  const [showDebitEdit, setShowDebitEdit] = useState(false);
  const [showAllCredit, setShowAllCredit] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const methodInitialised = useRef(false);

  // Load accounts and categories
  useEffect(() => {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => {});
    getBudgetCategories().then(setBudgetCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (isViewMode) return;
    getOfficeExpenses().then((rows) => {
      const map = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        if (r.drAccount && r.budgetCategoryId && !map[r.budgetCategoryId]) {
          map[r.budgetCategoryId] = r.drAccount;
        }
      });
      setLastDrByCategory(map);
    }).catch(() => {});
  }, [isViewMode]);

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
      setPaidTo(e.paidTo || '');
      setBillNo(e.billNo || '');
      setPaymentMethod(e.paymentMethod || '');
      setPaymentRef(e.paymentRef || '');
      setDrTouched(true);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load office expense.');
    });
  }, [id, isEdit]);

  function applyMethod(method, accountList) {
    setPaymentMethod(method);
    writeStore(LAST_METHOD_KEY, method);
    if (method === 'Cash') setPaymentRef('');
    const options = accountsForMethod(method, accountList);
    const remembered = readLastCredits()[method];
    const pick = options.find((a) => a.name === remembered) || options[0];
    if (pick) setCrAccount(pick.name);
  }

  useEffect(() => {
    if (isEdit || methodInitialised.current || accounts.length === 0) return;
    methodInitialised.current = true;
    const saved = readStore(LAST_METHOD_KEY, 'Cash');
    const valid = METHODS.some((m) => m.id === saved) ? saved : 'Cash';
    applyMethod(valid, accounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, isEdit]);

  useEffect(() => {
    if (isViewMode || drTouched || !budgetCategory) return;
    const category = budgetCategories.find((c) => String(c.id) === String(budgetCategory));
    const suggestion =
      lastDrByCategory[budgetCategory] ||
      (category?.parentId ? lastDrByCategory[category.parentId] : '');
    if (suggestion) setDrAccount(suggestion);
  }, [budgetCategory, budgetCategories, lastDrByCategory, drTouched, isViewMode]);

  useEffect(() => {
    if (isViewMode || !budgetCategory || !date) {
      setBudgetInfo(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      getOfficeExpenseBudgetStatus({ budgetCategory, date, excludeId: id })
        .then((d) => {
          if (!cancelled) setBudgetInfo(d);
        })
        .catch(() => {
          if (!cancelled) setBudgetInfo(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [budgetCategory, date, id, isViewMode]);

  const methodAccounts = useMemo(() => accountsForMethod(paymentMethod, accounts), [paymentMethod, accounts]);
  const filteredByMethod = !!paymentMethod && methodAccounts.length > 0;
  const creditOptions = filteredByMethod && !showAllCredit ? methodAccounts : accounts;
  const creditLabel =
    paymentMethod === 'Cash'
      ? 'Cash Ledger'
      : paymentMethod === 'Cheque'
      ? 'Bank Cheque Account'
      : 'Bank Account';

  const amt = Number(amount) || 0;
  const words = amountInWords(amt);
  const budgetCategoryName =
    budgetCategories.find((c) => String(c.id) === String(budgetCategory))?.name || '-';
  const sameAccount = !!drAccount && drAccount === crAccount;
  const entryReady = !!drAccount && !!crAccount && !sameAccount && amt > 0;
  const needsRef = paymentMethod === 'Bank' || paymentMethod === 'Cheque';

  function handleDebitChange(value) {
    setDrAccount(value);
    setDrTouched(true);
  }

  async function submit(addAnother) {
    setError('');
    setNotice('');
    if (!title.trim()) return setError('Title / Description is required');
    if (!budgetCategory) return setError('Office Budget Category is required');
    if (!(amt > 0)) return setError('Amount must be greater than 0');
    if (!drAccount || !crAccount) return setError('Debit Account and Credit Account are required');
    if (sameAccount) return setError('Debit and Credit accounts must be different');

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        budgetCategory,
        drAccount,
        crAccount,
        amount,
        reference,
        date,
        paidTo: paidTo.trim(),
        billNo: billNo.trim(),
        paymentMethod,
        paymentRef: paymentRef.trim(),
        attachmentFile,
      };
      const result = isEdit
        ? await updateOfficeExpense(id, payload)
        : await createOfficeExpense(payload);

      if (paymentMethod && crAccount) {
        writeStore(
          LAST_CREDIT_KEY,
          JSON.stringify({ ...readLastCredits(), [paymentMethod]: crAccount })
        );
      }
      if (result?.ledgerWarning)
        window.alert(`Saved, but the ledger entry was not posted: ${result.ledgerWarning}`);
      if (result?.budgetWarning) window.alert(result.budgetWarning);

      if (addAnother && !isEdit) {
        const savedRef = result?.reference || reference;
        setDrTouched(true);
        setTitle('');
        setAmount('');
        setPaidTo('');
        setBillNo('');
        setPaymentRef('');
        setAttachmentFile(null);
        setFileKey((k) => k + 1);
        setNotice(`${savedRef} posted successfully. Ready for next entry.`);
        getNextOfficeExpenseCode().then(setReference).catch(() => {});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/accounts-module/office-expense-list');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save office expense');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit(false);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/60 font-sans text-left">
      <Topbar />

      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/dashboard' },
                { label: 'Office Budget', to: '/accounts-module/office-budget' },
                {
                  label: isViewMode
                    ? 'View Office Expense'
                    : isEdit
                    ? 'Edit Office Expense'
                    : 'Office Expense',
                },
              ]}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isViewMode
                  ? 'Office Expense Voucher'
                  : isEdit
                  ? 'Edit Office Expense'
                  : 'New Office Expense'}
              </h1>
              {reference && (
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {reference}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isViewMode
                ? 'Read-only financial voucher and accounting records'
                : 'Post operational and administrative expenses against budget allocations'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isViewMode ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/accounts-module/office-expense-list')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
                >
                  <ArrowLeft size={16} /> Back to List
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/accounts-module/office-expense/${id}`)}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <Pencil size={15} /> Edit Voucher
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/accounts-module/office-expense-list')}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition"
              >
                <ArrowLeft size={16} /> Office Expense List
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3.5 shadow-sm">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-3.5 shadow-sm">
            <Check size={18} className="shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        {/* View Mode Layout */}
        {isViewMode ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Payment Voucher
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                  {reference || '—'}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Voucher Date</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {date
                      ? new Date(date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
                {status && (
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Status</div>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 capitalize">
                      {status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-white">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Total Paid</span>
                <span className="text-2xl font-bold font-mono text-slate-900">৳ {money(amount)}</span>
                <span className="text-[11px] text-slate-400 block mt-1 truncate" title={words}>
                  {words}
                </span>
              </div>
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Budget Category</span>
                <span className="text-base font-semibold text-indigo-700 block mt-1 truncate">
                  {budgetCategoryName}
                </span>
              </div>
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Paid Method</span>
                <span className="text-base font-semibold text-slate-800 block mt-1">
                  {paymentMethod || 'Cash'}
                </span>
                <span className="text-xs text-slate-400 block truncate">{crAccount}</span>
              </div>
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Payee Receiver</span>
                <span className="text-base font-semibold text-slate-800 block mt-1">
                  {paidTo || '-'}
                </span>
                {billNo && <span className="text-xs text-slate-400 block">Bill #{billNo}</span>}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Expense Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className={labelClass}>Description / Title</label>
                    <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {title}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ViewField label="Bill / Invoice No." value={billNo} mono />
                    <ViewField label="Transaction / Cheque Ref" value={paymentRef} mono />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ViewField label="Created By" value={addedBy} />
                    <div>
                      <label className={labelClass}>Receipt Document</label>
                      {attachmentUrl ? (
                        <a
                          href={resolveFileUrl(attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline mt-1"
                        >
                          <Paperclip size={14} /> Open attachment
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">No file attached</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Accounting Double-Entry
                </h3>
                <LedgerCard drAccount={drAccount} crAccount={crAccount} amount={amount} />
              </div>
            </div>
          </div>
        ) : (
          /* Form (Edit / Create) Mode - Modern Two-Column Layout */
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Expense & Billing Details (7 Columns) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="text-indigo-600" size={18} />
                    <h2 className="text-base font-bold text-slate-900">Expense Information</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Date:</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <Field label="Expense Title / Description" required>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Monthly Electricity Bill for Head Office"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Field label="Office Budget Category" required>
                      <select
                        value={budgetCategory}
                        onChange={(e) => setBudgetCategory(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select category</option>
                        {budgetCategories
                          .filter((c) => !c.parentId)
                          .map((top) => (
                            <optgroup key={top.id} label={top.name}>
                              <option value={top.id}>{top.name}</option>
                              {budgetCategories
                                .filter((c) => c.parentId === top.id)
                                .map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    — {sub.name}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Paid Amount (৳)" required>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputClass} pl-8 text-base font-bold text-slate-900`}
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                {words && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3.5 py-2 text-xs text-indigo-700 font-medium">
                    <span className="font-semibold text-indigo-900">In words:</span> {words}
                  </div>
                )}

                {/* Live Budget Meter Indicator */}
                <BudgetMeter info={budgetInfo} amount={amt} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <Field label="Paid To (Payee Name)">
                    <input
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                      className={inputClass}
                      placeholder="Vendor, contractor, or person"
                    />
                  </Field>
                  <Field label="Bill / Invoice Number">
                    <input
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. INV-2026-081"
                    />
                  </Field>
                </div>

                {/* File Attachment */}
                <div className="pt-2">
                  <label className={labelClass}>Receipt / Supporting Voucher</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer transition">
                      <Paperclip size={15} />
                      {attachmentFile ? 'Replace document' : 'Attach voucher file'}
                      <input
                        key={fileKey}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {attachmentFile && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <FileText size={13} className="text-indigo-600" />
                        <span className="max-w-[200px] truncate">{attachmentFile.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentFile(null);
                            setFileKey((k) => k + 1);
                          }}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    {attachmentUrl && !attachmentFile && (
                      <span className="text-xs text-slate-500">
                        Current:{' '}
                        <a
                          href={resolveFileUrl(attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          View existing file
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Payment Mode & Accounting Ledger (5 Columns) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Payment Configuration Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Wallet className="text-indigo-600" size={18} />
                    <h2 className="text-base font-bold text-slate-900">Payment & Account</h2>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className={labelClass}>Payment Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      {METHODS.map((m) => {
                        const Icon = m.icon;
                        const active = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => applyMethod(m.id, accounts)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                              active
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={18} className="mb-1" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Credit Account selection */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelClass}>
                        {creditLabel} <span className="text-rose-500">*</span>
                      </label>
                      {filteredByMethod && (
                        <button
                          type="button"
                          onClick={() => setShowAllCredit((v) => !v)}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline mb-1"
                        >
                          {showAllCredit ? 'Filter by method' : 'Show all accounts'}
                        </button>
                      )}
                    </div>
                    <select
                      value={crAccount}
                      onChange={(e) => setCrAccount(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select account</option>
                      {creditOptions.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                      {crAccount && !creditOptions.some((a) => a.name === crAccount) && (
                        <option value={crAccount}>{crAccount}</option>
                      )}
                    </select>
                  </div>

                  {/* Cheque / Bank Reference */}
                  {needsRef && (
                    <Field
                      label={
                        paymentMethod === 'Cheque' ? 'Cheque Leaf Number' : 'Transaction Ref / ID'
                      }
                    >
                      <input
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className={inputClass}
                        placeholder={
                          paymentMethod === 'Cheque'
                            ? 'e.g. CQ-9920141'
                            : 'Bank transaction ID / voucher'
                        }
                      />
                    </Field>
                  )}
                </div>

                {/* Accounting Ledger Strip */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Accounting Entry (Double-Entry)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDebitEdit((v) => !v)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      {showDebitEdit ? 'Hide debit selection' : 'Change debit account'}
                    </button>
                  </div>

                  {(showDebitEdit || !drAccount) && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Expense Debit Account (Charge To)
                      </label>
                      <select
                        value={drAccount}
                        onChange={(e) => handleDebitChange(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select expense account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <LedgerCard drAccount={drAccount} crAccount={crAccount} amount={amount}>
                    <div className="pt-2 text-xs">
                      {sameAccount ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                          <AlertCircle size={14} /> Debit and credit accounts cannot be identical
                        </span>
                      ) : entryReady ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                          <Check size={14} /> Balanced entry ready for journal posting
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Complete category and amount to generate entry
                        </span>
                      )}
                    </div>
                  </LedgerCard>
                </div>

                {/* Action Buttons */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/accounts-module/office-expense-list')}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  {!isEdit && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submit(true)}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      Save & Add Another
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm shadow-indigo-600/25 disabled:opacity-50 transition"
                  >
                    {submitting ? 'Posting...' : isEdit ? 'Update Expense' : 'Post Expense'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- UI Components ----------

function LedgerCard({ drAccount, crAccount, amount, children }) {
  return (
    <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 font-mono text-xs space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
        <span className="text-slate-400 font-bold">TYPE / ACCOUNT</span>
        <span className="text-slate-400 font-bold">AMOUNT</span>
      </div>
      <div className="flex items-center justify-between text-slate-800">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">Dr</span>
          <span className="truncate">{drAccount || 'Debit Account not selected'}</span>
        </div>
        <span className="font-bold text-slate-900 shrink-0 ml-2">৳ {money(amount)}</span>
      </div>
      <div className="flex items-center justify-between text-slate-800">
        <div className="flex items-center gap-2 truncate pl-2">
          <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded">Cr</span>
          <span className="truncate">{crAccount || 'Credit Account not selected'}</span>
        </div>
        <span className="font-bold text-slate-900 shrink-0 ml-2">৳ {money(amount)}</span>
      </div>
      {children}
    </div>
  );
}

function BudgetMeter({ info, amount }) {
  if (!info) return null;

  if (!info.hasBudget || !(info.allocated > 0)) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <HelpCircle size={15} className="text-slate-400 shrink-0" />
        <span>No budget cap set for this category in this month.</span>
      </div>
    );
  }

  const { allocated, spent } = info;
  const after = spent + amount;
  const over = after > allocated;
  const spentPct = Math.min(100, (spent / allocated) * 100);
  const thisPct = Math.max(0, Math.min(100 - spentPct, (amount / allocated) * 100));
  const monthLabel = new Date(info.year, info.month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-indigo-600" />
          Budget Status ({monthLabel})
        </span>
        <span className={over ? 'text-rose-600' : 'text-slate-600'}>
          {over
            ? `Exceeds by ৳${money0(after - allocated)}`
            : `৳${money0(allocated - after)} remaining`}
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex">
        <div className="bg-slate-400" style={{ width: `${spentPct}%` }} />
        <div
          className={over ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600'}
          style={{ width: `${thisPct}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Spent: ৳{money0(spent)}</span>
        <span>Allocated: ৳{money0(allocated)}</span>
      </div>

      {info.budgetStatus && info.budgetStatus !== 'Approved' && (
        <p className="text-[11px] text-amber-700 font-medium">
          Note: This month's budget is {String(info.budgetStatus).toLowerCase()}, pending final
          approval.
        </p>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ViewField({ label, value, mono, capitalize }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <p
        className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''} ${
          capitalize ? 'capitalize' : ''
        }`}
      >
        {value || '-'}
      </p>
    </div>
  );
}