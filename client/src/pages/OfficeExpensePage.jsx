import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Pencil,
  Paperclip,
  Check,
  AlertCircle,
  X,
  Receipt,
  FileText,
  ArrowLeft,
  HelpCircle,
  TrendingUp,
  Plus,
  Eye,
  Trash2,
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  RotateCcw,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import {
  getOfficeExpense,
  getOfficeExpenses,
  getNextOfficeExpenseCode,
  getOfficeExpenseBudgetStatus,
  getOfficeExpenseSummary,
  createOfficeExpense,
  updateOfficeExpense,
  updateOfficeExpenseStatus,
  deleteOfficeExpense,
} from '../api/officeExpense';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getBudgetCategories, getAccountDefaults } from '../api/budgetCategory';

const METHODS = [
  { id: 'Cash', label: 'Cash' },
  { id: 'Bank', label: 'Bank Transfer' },
  { id: 'Cheque', label: 'Cheque' },
];

const LAST_METHOD_KEY = 'officeExpense:lastMethod';
const LAST_CREDIT_KEY = 'officeExpense:lastCreditByMethod';
const LIST_PREVIEW_ROWS = 10;

const inputClass =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';
const cardClass = 'bg-white rounded-2xl border border-slate-200 shadow-sm';

const STATUS = {
  approved: {
    label: 'Posted',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/70',
    dot: 'bg-amber-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/70',
    dot: 'bg-rose-500',
  },
};

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

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function accountsForMethod(method, accounts) {
  if (!method) return accounts;
  const pattern = method === 'Cash' ? /cash/i : /bank/i;
  return accounts.filter((a) => pattern.test(a.name || ''));
}

// Server-saved default credit account for a payment channel
function defaultCreditFor(method, defs) {
  if (!defs) return '';
  if (method === 'Cash') return defs.cashAccount || '';
  if (method === 'Cheque') return defs.chequeAccount || defs.bankAccount || '';
  return defs.bankAccount || '';
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

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const isAdmin = !!currentUser && ['superadmin', 'admin'].includes(currentUser.role);
  const isAccountant = currentUser?.role === 'accountant';

  const [accounts, setAccounts] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [lastDrByCategory, setLastDrByCategory] = useState({});
  const [accountDefaults, setAccountDefaults] = useState({
    cashAccount: '',
    bankAccount: '',
    chequeAccount: '',
  });
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

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
  const [createdAt, setCreatedAt] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [drTouched, setDrTouched] = useState(false);
  const [drSource, setDrSource] = useState(''); // '' | 'default' | 'history' | 'manual'
  const [showDebitEdit, setShowDebitEdit] = useState(false);
  const [showAllCredit, setShowAllCredit] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actingId, setActingId] = useState(null);

  // Side panels: today's entries, summary tiles, daily list
  const [todayRows, setTodayRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [listRows, setListRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listFrom, setListFrom] = useState(todayStr());
  const [listTo, setListTo] = useState(todayStr());
  const [listCategory, setListCategory] = useState('');
  const [listStatus, setListStatus] = useState('all');
  const [listSearch, setListSearch] = useState('');

  const methodInitialised = useRef(false);

  const autoApprove = !!(summary?.autoApproveAdmin && isAdmin);

  // Load accounts, categories and the saved credit defaults
  useEffect(() => {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => {});
    getBudgetCategories().then(setBudgetCategories).catch(() => {});
    getAccountDefaults()
      .then(setAccountDefaults)
      .catch(() => {})
      .finally(() => setDefaultsLoaded(true));
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
      setCreatedAt(e.createdAt || '');
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

  // ----- side data -----

  const loadSideData = useCallback(() => {
    const today = todayStr();
    getOfficeExpenses({ from: today, to: today })
      .then((rows) => setTodayRows(Array.isArray(rows) ? rows : []))
      .catch(() => setTodayRows([]));
    getOfficeExpenseSummary({ date: today }).then(setSummary).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const rows = await getOfficeExpenses({ from: listFrom || undefined, to: listTo || undefined });
      setListRows(Array.isArray(rows) ? rows : []);
    } catch {
      setListRows([]);
    } finally {
      setListLoading(false);
    }
  }, [listFrom, listTo]);

  useEffect(() => {
    loadSideData();
  }, [loadSideData]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const refreshAll = useCallback(() => {
    loadSideData();
    loadList();
  }, [loadSideData, loadList]);

  // ----- credit / debit defaults -----

  // Credit account: saved default for the channel -> last used -> first match
  function applyMethod(method, accountList, defs = accountDefaults) {
    setPaymentMethod(method);
    writeStore(LAST_METHOD_KEY, method);
    if (method === 'Cash') setPaymentRef('');

    const saved = defaultCreditFor(method, defs);
    const fromDefault = saved && accountList.some((a) => a.name === saved) ? saved : '';
    const options = accountsForMethod(method, accountList);
    const remembered = readLastCredits()[method];
    const fromHistory = options.find((a) => a.name === remembered)?.name;
    const pick = fromDefault || fromHistory || options[0]?.name;
    if (pick) setCrAccount(pick);
  }

  useEffect(() => {
    if (isEdit || methodInitialised.current || accounts.length === 0 || !defaultsLoaded) return;
    methodInitialised.current = true;
    const saved = readStore(LAST_METHOD_KEY, 'Cash');
    const valid = METHODS.some((m) => m.id === saved) ? saved : 'Cash';
    applyMethod(valid, accounts, accountDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, defaultsLoaded, isEdit]);

  // Debit account: category default -> parent default -> last used for this category
  useEffect(() => {
    if (isViewMode || isEdit || drTouched || !budgetCategory) return;
    const category = budgetCategories.find((c) => String(c.id) === String(budgetCategory));
    const parent = category?.parentId
      ? budgetCategories.find((c) => String(c.id) === String(category.parentId))
      : null;

    const fromDefault = category?.defaultDrAccount || parent?.defaultDrAccount || '';
    const fromHistory =
      lastDrByCategory[budgetCategory] ||
      (category?.parentId ? lastDrByCategory[category.parentId] : '') ||
      '';

    if (fromDefault) {
      setDrAccount(fromDefault);
      setDrSource('default');
    } else if (fromHistory) {
      setDrAccount(fromHistory);
      setDrSource('history');
    }
  }, [budgetCategory, budgetCategories, lastDrByCategory, drTouched, isViewMode, isEdit]);

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

  // ----- derived -----

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
  const creditIsDefault =
    !!crAccount && crAccount === defaultCreditFor(paymentMethod, accountDefaults);
  const statusKey = String(status || '').toLowerCase();

  const recentRows = useMemo(() => todayRows.slice(0, 5), [todayRows]);

  const listCategoryOptions = useMemo(() => {
    const set = new Set();
    listRows.forEach((r) => {
      if (r.budgetCategory?.name) set.add(r.budgetCategory.name);
    });
    return Array.from(set).sort();
  }, [listRows]);

  const filteredList = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    return listRows.filter((r) => {
      if (listCategory && r.budgetCategory?.name !== listCategory) return false;
      if (listStatus !== 'all' && String(r.status || '').toLowerCase() !== listStatus) return false;
      if (!term) return true;
      return `${r.reference || ''} ${r.title || ''} ${r.paidTo || ''} ${r.budgetCategory?.name || ''}`
        .toLowerCase()
        .includes(term);
    });
  }, [listRows, listCategory, listStatus, listSearch]);

  // ----- handlers -----

  function resetForm() {
    setError('');
    setNotice('');
    setTitle('');
    setAmount('');
    setPaidTo('');
    setBillNo('');
    setPaymentRef('');
    setAttachmentFile(null);
    setFileKey((k) => k + 1);
    setBudgetCategory('');
    setDrAccount('');
    setDrSource('');
    setDrTouched(false);
    setShowDebitEdit(false);
  }

  function handleCategoryChange(value) {
    setBudgetCategory(value);
    if (!isEdit) {
      // New category -> let its default debit account take over
      setDrAccount('');
      setDrSource('');
      setDrTouched(false);
    }
  }

  function handleDebitChange(value) {
    setDrAccount(value);
    setDrTouched(true);
    setDrSource('manual');
  }

  async function submit() {
    setError('');
    setNotice('');
    if (!title.trim()) return setError('Description is required');
    if (!budgetCategory) return setError('Expense Head (budget category) is required');
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
      if (result?.budgetWarning) window.alert(result.budgetWarning);

      if (isEdit) {
        navigate('/accounts-module/office-expense-list');
        return;
      }

      const savedRef = result?.reference || reference;
      const posted = String(result?.status || '').toLowerCase() === 'approved';
      resetForm();
      setNotice(
        posted
          ? `${savedRef} saved. The journal entry was posted to the ledger automatically.`
          : `${savedRef} saved. It posts to the ledger automatically once an admin approves it.`
      );
      getNextOfficeExpenseCode().then(setReference).catch(() => {});
      refreshAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save office expense');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit();
  }

  async function handleDelete(item) {
    const itemApproved = String(item.status || '').toLowerCase() === 'approved';
    if (!isAdmin && itemApproved) {
      window.alert('Approved records cannot be deleted by an Accountant.');
      return;
    }
    if (!window.confirm(`Delete "${item.title || item.reference}"? Its journal entry is removed too.`)) return;
    setActingId(item.id);
    try {
      await deleteOfficeExpense(item.id);
      if (String(item.id) === String(id)) {
        navigate('/accounts-module/office-expense');
      }
      refreshAll();
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Failed to delete expense.');
    } finally {
      setActingId(null);
    }
  }

  async function handleStatus(item, newStatus) {
    if (!isAdmin) return;
    const verb = newStatus === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} "${item.title || item.reference}" for ৳${money(item.amount)}?`)) return;
    setActingId(item.id);
    try {
      await updateOfficeExpenseStatus(item.id, newStatus);
      if (String(item.id) === String(id)) setStatus(newStatus);
      refreshAll();
    } catch (err) {
      window.alert(err?.response?.data?.message || `Failed to ${verb} expense.`);
    } finally {
      setActingId(null);
    }
  }

  const canEditRow = (item) => {
    const approved = String(item.status || '').toLowerCase() === 'approved';
    return isAdmin || (!approved && isAccountant);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/60 font-sans text-left">
      <Topbar />

      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
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
                : 'Daily Expense Entry',
            },
          ]}
        />

        {/* Header */}
        <div className={`${cardClass} p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isViewMode ? 'Office Expense Voucher' : isEdit ? 'Edit Daily Expense' : 'Daily Expense Entry'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isViewMode
                  ? 'Read-only voucher and accounting record'
                  : 'Track your daily office expenses. The journal entry is created automatically.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {isViewMode ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/accounts-module/office-expense-list')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
                >
                  <ArrowLeft size={16} /> Back to List
                </button>
                {(isAdmin || (isAccountant && statusKey !== 'approved')) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/accounts-module/office-expense/${id}`)}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
                  >
                    <Pencil size={15} /> Edit Voucher
                  </button>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                  />
                </div>
                {reference && (
                  <span className="font-mono text-xs font-semibold px-2.5 py-2.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {reference}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => (isEdit ? navigate('/accounts-module/office-expense') : resetForm())}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
                >
                  <Plus size={16} strokeWidth={2.5} /> New Expense
                </button>
              </>
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
          <>
            <div className={`${cardClass} overflow-hidden`}>
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
                    <div className="text-sm font-semibold text-slate-800">{fmtDate(date)}</div>
                  </div>
                  {status && (
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Status</div>
                      <div className="mt-0.5">
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-white">
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Total Paid</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">৳ {money(amount)}</span>
                  <span className="text-[11px] text-slate-400 block mt-1 truncate" title={words}>
                    {words}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Expense Head</span>
                  <span className="text-base font-semibold text-amber-700 block mt-1 truncate">
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
                      <label className={labelClass}>Description</label>
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
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline mt-1"
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

            <ApprovalPanel
              item={{ id, status, title, reference, amount }}
              createdAt={createdAt}
              isNew={false}
              autoApprove={false}
              isAdmin={isAdmin}
              canEdit={isAdmin || (isAccountant && statusKey !== 'approved')}
              acting={actingId === id}
              onEdit={() => navigate(`/accounts-module/office-expense/${id}`)}
              onDelete={() => handleDelete({ id, status, title, reference })}
              onStatus={handleStatus}
            />
          </>
        ) : (
          <>
            {/* Entry form + today's panels */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: Expense information */}
                <div className={`lg:col-span-7 ${cardClass} p-6 space-y-5`}>
                  <h2 className="text-base font-bold text-slate-900">Expense Information</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Expense Head" required>
                      <select
                        value={budgetCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select expense head</option>
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

                    <Field label="Paid To (Vendor)">
                      <input
                        value={paidTo}
                        onChange={(e) => setPaidTo(e.target.value)}
                        className={inputClass}
                        placeholder="Vendor, contractor, or person"
                      />
                    </Field>

                    <Field label="Bill / Invoice No.">
                      <input
                        value={billNo}
                        onChange={(e) => setBillNo(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. INV-2026-081"
                      />
                    </Field>

                    <Field label="Payment Method" required>
                      <select
                        value={paymentMethod}
                        onChange={(e) => applyMethod(e.target.value, accounts)}
                        className={inputClass}
                      >
                        {METHODS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Amount (৳)" required>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass} font-bold text-slate-900`}
                      />
                    </Field>

                    <Field label="Voucher ID">
                      <input
                        value={reference}
                        readOnly
                        className={`${inputClass} bg-slate-50 font-mono text-slate-600`}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>
                          {creditLabel} (paid from) <span className="text-rose-500">*</span>
                        </label>
                        {filteredByMethod && (
                          <button
                            type="button"
                            onClick={() => setShowAllCredit((v) => !v)}
                            className="text-[11px] font-semibold text-amber-700 hover:underline mb-1"
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
                      {creditIsDefault && (
                        <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                          Auto-selected from your default {paymentMethod.toLowerCase()} account.
                        </p>
                      )}
                    </div>

                    {needsRef && (
                      <Field label={paymentMethod === 'Cheque' ? 'Cheque Leaf Number' : 'Transaction Ref / ID'}>
                        <input
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className={inputClass}
                          placeholder={paymentMethod === 'Cheque' ? 'e.g. CQ-9920141' : 'Bank txn ID'}
                        />
                      </Field>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Field label="Description" required>
                        <textarea
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          maxLength={255}
                          rows={4}
                          className={`${inputClass} resize-none`}
                          placeholder="e.g. Monthly electricity bill for head office"
                        />
                      </Field>
                    </div>

                    <div>
                      <label className={labelClass}>Receipt / Bill</label>
                      <label className="flex flex-col items-center justify-center text-center h-[104px] rounded-lg border border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40 cursor-pointer transition px-3">
                        <Paperclip size={18} className="text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          {attachmentFile ? 'Replace file' : 'Upload Receipt / Bill'}
                        </span>
                        <span className="text-[10px] text-slate-400">JPG, PNG, PDF</span>
                        <input
                          key={fileKey}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      {attachmentFile && (
                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 max-w-full">
                          <FileText size={12} className="text-amber-600 shrink-0" />
                          <span className="truncate">{attachmentFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachmentFile(null);
                              setFileKey((k) => k + 1);
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      )}
                      {attachmentUrl && !attachmentFile && (
                        <a
                          href={resolveFileUrl(attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-amber-700 font-semibold hover:underline"
                        >
                          View existing file
                        </a>
                      )}
                    </div>
                  </div>

                  {words && (
                    <div className="bg-amber-50/70 border border-amber-100 rounded-lg px-3.5 py-2 text-xs text-amber-800 font-medium">
                      <span className="font-semibold">In words:</span> {words}
                    </div>
                  )}

                  <BudgetMeter info={budgetInfo} amount={amt} />

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold px-6 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition"
                    >
                      {submitting ? 'Saving...' : isEdit ? 'Update Expense' : 'Save Expense'}
                    </button>
                    {isEdit ? (
                      <button
                        type="button"
                        onClick={() => navigate('/accounts-module/office-expense-list')}
                        className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
                      >
                        <RotateCcw size={14} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT: Recent expenses + quick summary */}
                <div className="lg:col-span-5 space-y-5">
                  <div className={`${cardClass} p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-slate-900">Recent Expenses (Today)</h2>
                      <Link
                        to="/accounts-module/office-expense-list"
                        className="text-xs font-semibold text-sky-600 hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                            <th className="py-2 px-3 rounded-l-lg">#</th>
                            <th className="py-2 px-3">Expense Head</th>
                            <th className="py-2 px-3 text-right">Amount (৳)</th>
                            <th className="py-2 px-3">Paid To</th>
                            <th className="py-2 px-3 rounded-r-lg">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentRows.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">
                                No expenses recorded today.
                              </td>
                            </tr>
                          ) : (
                            recentRows.map((r, i) => (
                              <tr key={r.id}>
                                <td className="py-2.5 px-3 text-slate-500">{i + 1}</td>
                                <td className="py-2.5 px-3 text-slate-800">{r.budgetCategory?.name || '—'}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-900">{money0(r.amount)}</td>
                                <td className="py-2.5 px-3 text-slate-600 truncate max-w-[110px]">{r.paidTo || '—'}</td>
                                <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={`${cardClass} p-5`}>
                    <h2 className="text-base font-bold text-slate-900 mb-3">Quick Summary (Today)</h2>
                    <div className="grid grid-cols-3 gap-3">
                      <SummaryTile
                        icon={<FileText size={18} />}
                        tone="bg-sky-50 text-sky-600"
                        label="Total Expenses"
                        value={summary ? `৳ ${money0(summary.today.total)}` : '—'}
                      />
                      <SummaryTile
                        icon={<TrendingUp size={18} />}
                        tone="bg-emerald-50 text-emerald-600"
                        label="This Month"
                        value={summary ? `৳ ${money0(summary.month.total)}` : '—'}
                      />
                      <SummaryTile
                        icon={<Clock size={18} />}
                        tone="bg-amber-50 text-amber-600"
                        label="Pending Approval"
                        value={summary ? `৳ ${money0(summary.pending.total)}` : '—'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Daily expense list */}
            <div className={`${cardClass} overflow-hidden`}>
              <div className="p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Daily Expense List</h2>
                    <p className="text-xs text-slate-500">View, manage and track all daily expenses.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">From</label>
                    <input
                      type="date"
                      value={listFrom}
                      onChange={(e) => setListFrom(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
                    <input
                      type="date"
                      value={listTo}
                      onChange={(e) => setListTo(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Expense Head</label>
                    <select
                      value={listCategory}
                      onChange={(e) => setListCategory(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                    >
                      <option value="">All</option>
                      {listCategoryOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                    <select
                      value={listStatus}
                      onChange={(e) => setListStatus(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                    >
                      <option value="all">All</option>
                      <option value="approved">Posted</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-40 border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Expense Head</th>
                      <th className="py-3 px-4">Paid To</th>
                      <th className="py-3 px-4 text-right">Amount (৳)</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Voucher ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listLoading ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                          Loading expenses...
                        </td>
                      </tr>
                    ) : filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                          No expenses found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredList.slice(0, LIST_PREVIEW_ROWS).map((r, i) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-slate-500">{i + 1}</td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">{fmtDate(r.date)}</td>
                          <td className="py-3 px-4 text-slate-800">{r.budgetCategory?.name || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{r.paidTo || '—'}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {money0(r.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{r.paymentMethod || '—'}</td>
                          <td className="py-3 px-4 font-mono text-xs text-sky-700">{r.reference || '—'}</td>
                          <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View"
                                onClick={() => navigate(`/accounts-module/office-expense/${r.id}?mode=view`)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition"
                              >
                                <Eye size={14} />
                              </button>
                              {canEditRow(r) ? (
                                <>
                                  <button
                                    type="button"
                                    title="Edit"
                                    onClick={() => navigate(`/accounts-module/office-expense/${r.id}`)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    disabled={actingId === r.id}
                                    onClick={() => handleDelete(r)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <span
                                  title="Posted records cannot be changed by an Accountant"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 cursor-not-allowed"
                                >
                                  <Lock size={13} />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!listLoading && filteredList.length > LIST_PREVIEW_ROWS && (
                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Showing {LIST_PREVIEW_ROWS} of {filteredList.length} expenses.
                  </span>
                  <Link
                    to="/accounts-module/office-expense-list"
                    className="font-semibold text-sky-600 hover:underline"
                  >
                    Open full list
                  </Link>
                </div>
              )}
            </div>

            {/* Journal entry + approval workflow */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className={`lg:col-span-7 ${cardClass} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Journal Entry (Auto Generated)</h2>
                    <p className="text-xs text-slate-500">Based on the expense entry. Nothing to post by hand.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDebitEdit((v) => !v)}
                    className="text-xs font-semibold text-amber-700 hover:underline"
                  >
                    {showDebitEdit ? 'Hide debit selection' : 'Change debit account'}
                  </button>
                </div>

                {(showDebitEdit || !drAccount) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
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

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-3">
                    <JournalTable drAccount={drAccount} crAccount={crAccount} amount={amt} />
                  </div>
                  <div className="md:col-span-2 bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-amber-600" /> Accounting Note
                    </p>
                    {sameAccount ? (
                      <p className="text-rose-600 font-semibold flex items-center gap-1.5">
                        <AlertCircle size={13} /> Debit and credit accounts cannot be identical.
                      </p>
                    ) : entryReady ? (
                      <>
                        <p>Debit: {drAccount} (৳{money0(amt)})</p>
                        <p>Credit: {crAccount} (৳{money0(amt)})</p>
                        <p className="text-emerald-700 font-medium">
                          {isEdit && statusKey !== 'approved'
                            ? 'Posts to the ledger automatically once an admin approves it.'
                            : autoApprove
                            ? 'Posts to the ledger automatically when you save.'
                            : 'Posts to the ledger automatically once an admin approves it.'}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500">Choose an expense head and enter an amount to see the entry.</p>
                    )}
                    {drSource === 'default' && (
                      <p className="text-emerald-700">Debit filled from the head's default account.</p>
                    )}
                    {drSource === 'history' && (
                      <p className="text-slate-500">Debit filled from your last expense in this head.</p>
                    )}
                    {budgetCategory && !drAccount && !isEdit && (
                      <p className="text-amber-700">
                        No default debit account for this head. Set one in Budget Categories to skip this step.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <ApprovalPanel
                  item={{ id, status, title, reference, amount }}
                  createdAt={createdAt}
                  isNew={!isEdit}
                  autoApprove={autoApprove}
                  isAdmin={isAdmin}
                  canEdit={isAdmin || (isAccountant && statusKey !== 'approved')}
                  acting={actingId === id}
                  onEdit={() => navigate(`/accounts-module/office-expense/${id}`)}
                  onDelete={() => handleDelete({ id, status, title, reference })}
                  onStatus={handleStatus}
                  compact
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- UI Components ----------

function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const conf = STATUS[key] || STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${conf.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  );
}

function SummaryTile({ icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
        <p className="text-base font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function JournalTable({ drAccount, crAccount, amount }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500">
            <th className="py-2 px-3">Account Head</th>
            <th className="py-2 px-3 text-right">Debit (৳)</th>
            <th className="py-2 px-3 text-right">Credit (৳)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          <tr>
            <td className="py-2.5 px-3 truncate max-w-[200px]">{drAccount || 'Debit account not selected'}</td>
            <td className="py-2.5 px-3 text-right font-mono">{amount > 0 ? money0(amount) : '-'}</td>
            <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
          </tr>
          <tr>
            <td className="py-2.5 px-3 truncate max-w-[200px] pl-6">{crAccount || 'Credit account not selected'}</td>
            <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
            <td className="py-2.5 px-3 text-right font-mono">{amount > 0 ? money0(amount) : '-'}</td>
          </tr>
          <tr className="bg-slate-50 font-semibold">
            <td className="py-2.5 px-3">Total</td>
            <td className="py-2.5 px-3 text-right font-mono">{amount > 0 ? money0(amount) : '-'}</td>
            <td className="py-2.5 px-3 text-right font-mono">{amount > 0 ? money0(amount) : '-'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Approval stepper + quick actions. There is no manual "post" step: approval
// posts the journal entry on the server.
function ApprovalPanel({
  item,
  createdAt,
  isNew,
  autoApprove,
  isAdmin,
  canEdit,
  acting,
  onEdit,
  onDelete,
  onStatus,
  compact,
}) {
  const s = String(item.status || '').toLowerCase();

  let states;
  if (isNew) states = ['current', 'todo', 'todo', 'todo'];
  else if (s === 'approved') states = ['done', 'done', 'done', 'done'];
  else if (s === 'rejected') states = ['done', 'rejected', 'todo', 'todo'];
  else states = ['done', 'current', 'todo', 'todo'];

  const steps = [
    { label: 'Entry Created', sub: isNew ? 'When you save' : fmtDateTime(createdAt) },
    {
      label: s === 'rejected' ? 'Rejected' : 'Pending Approval',
      sub: isNew && autoApprove ? 'Skipped for admin' : s === 'rejected' ? 'Not posted' : 'Admin review',
    },
    { label: 'Posted', sub: 'Journal entry' },
    { label: 'Ledger Updated', sub: 'Reports pick it up' },
  ];

  const dotClass = {
    done: 'bg-emerald-500 text-white',
    current: 'bg-amber-400 text-slate-900',
    rejected: 'bg-rose-500 text-white',
    todo: 'bg-slate-200 text-slate-400',
  };

  const hasId = !!item.id && !isNew;
  const pending = s === 'pending';

  return (
    <div className={`${cardClass} p-5 space-y-4`}>
      <h2 className="text-base font-bold text-slate-900">Approval Workflow</h2>

      <div className="flex items-start">
        {steps.map((step, i) => (
          <div key={step.label} className="flex-1 min-w-0 relative">
            {i > 0 && (
              <div
                className={`absolute top-3.5 right-1/2 w-full h-0.5 ${
                  states[i] === 'todo' ? 'bg-slate-200' : states[i] === 'rejected' ? 'bg-rose-300' : 'bg-emerald-300'
                }`}
              />
            )}
            <div className="relative flex flex-col items-center text-center px-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${dotClass[states[i]]}`}>
                {states[i] === 'done' ? (
                  <Check size={14} strokeWidth={3} />
                ) : states[i] === 'rejected' ? (
                  <XCircle size={14} />
                ) : states[i] === 'current' ? (
                  <Clock size={14} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                )}
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-800 leading-tight">{step.label}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{step.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Quick Actions</h3>
        {!hasId ? (
          <p className="text-xs text-slate-500">Actions appear here once the expense is saved.</p>
        ) : (
          <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {isAdmin && pending ? (
              <button
                type="button"
                disabled={acting}
                onClick={() => onStatus(item, 'approved')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <Check size={14} /> Approve
              </button>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200">
                <Lock size={13} /> {s === 'approved' ? 'Posted' : s === 'rejected' ? 'Rejected' : 'Awaiting admin'}
              </span>
            )}
            <button
              type="button"
              disabled={!canEdit}
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              disabled={!canEdit || acting}
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        )}
        {hasId && isAdmin && pending && (
          <button
            type="button"
            disabled={acting}
            onClick={() => onStatus(item, 'rejected')}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
          >
            <XCircle size={13} /> Reject this expense
          </button>
        )}
      </div>
    </div>
  );
}

function LedgerCard({ drAccount, crAccount, amount, children }) {
  return (
    <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 font-mono text-xs space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
        <span className="text-slate-400 font-bold">TYPE / ACCOUNT</span>
        <span className="text-slate-400 font-bold">AMOUNT</span>
      </div>
      <div className="flex items-center justify-between text-slate-800">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">Dr</span>
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
          <TrendingUp size={14} className="text-amber-600" />
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
          className={over ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}
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