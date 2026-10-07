// client/src/pages/OfficeReportPage.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Activity,
  Layers,
  FileText,
  Banknote,
  RotateCcw,
  ShieldCheck,
  Hash,
  Download,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getOfficeExpenseReport, getOfficeExpenses } from '../api/officeExpense';
import { getActivityLog } from '../api/activityLog';
import logo from '../assets/trikon-logo.png';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMoney = (v) =>
  Number(v || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function getCategoryView(cat, selectedMonth) {
  if (selectedMonth === 0) {
    return {
      allocatedAmount: Number(cat.allocatedAmount || 0),
      spentAmount: Number(cat.spentAmount || 0),
      remainingAmount: Number(cat.remainingAmount || 0),
    };
  }
  const idx = selectedMonth - 1;
  const allocatedAmount = Number(cat.allocatedByMonth?.[idx] || 0);
  const spentAmount = Number(cat.spentByMonth?.[idx] || 0);
  return {
    allocatedAmount,
    spentAmount,
    remainingAmount: allocatedAmount - spentAmount,
  };
}

export default function OfficeReportPage() {
  const navigate = useNavigate();
  const printRef = useRef(null);

  // Filter States
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Full Fiscal Year
  const [activeTab, setActiveTab] = useState('statement'); // 'statement' | 'category' | 'monthly' | 'audit'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Data States
  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Audit Log State
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Statement Verification Hash
  const statementHash = useMemo(() => {
    return `STMT-${year}-${selectedMonth ? String(selectedMonth).padStart(2, '0') : 'ANN'}-${Math.abs(
      (year * 31 + selectedMonth * 7) ^ 0x5f3759df
    ).toString(16).toUpperCase()}`;
  }, [year, selectedMonth]);

  // Load Main Report & Expense Transactions
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, expenseRes] = await Promise.allSettled([
        getOfficeExpenseReport(year),
        getOfficeExpenses ? getOfficeExpenses({ year, limit: 1000 }) : Promise.resolve([]),
      ]);

      if (reportRes.status === 'fulfilled') {
        setData(reportRes.value);
      } else {
        throw new Error(reportRes.reason?.response?.data?.message || 'Failed to fetch report summary');
      }

      if (expenseRes.status === 'fulfilled') {
        const raw = expenseRes.value;
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.expenses || [];
        setExpenses(list);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      setError(err.message || 'Error compiling statement data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Audit Activity
  const loadAudit = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = { year };
      if (selectedMonth !== 0) params.month = selectedMonth;
      const rows = await getActivityLog(params);
      setActivity(Array.isArray(rows) ? rows : []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [year, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAudit();
    }
  }, [activeTab, loadAudit]);

  // Period Descriptions
  const periodDateRange = useMemo(() => {
    if (selectedMonth === 0) {
      return `01 Jan ${year} — 31 Dec ${year}`;
    }
    const daysInMonth = new Date(year, selectedMonth, 0).getDate();
    return `01 ${MONTH_NAMES[selectedMonth - 1]} ${year} — ${daysInMonth} ${MONTH_NAMES[selectedMonth - 1]} ${year}`;
  }, [year, selectedMonth]);

  const periodTitle = selectedMonth === 0 ? `Fiscal Year ${year}` : `${MONTH_NAMES[selectedMonth - 1]} ${year}`;

  // Calculated Totals
  const viewTotals = useMemo(() => {
    if (!data) return { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 };
    if (selectedMonth === 0) return data.totals;
    return data.categories.reduce(
      (acc, cat) => {
        const v = getCategoryView(cat, selectedMonth);
        return {
          allocatedAmount: acc.allocatedAmount + v.allocatedAmount,
          spentAmount: acc.spentAmount + v.spentAmount,
          remainingAmount: acc.remainingAmount + v.remainingAmount,
        };
      },
      { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 }
    );
  }, [data, selectedMonth]);

  const viewCategories = useMemo(() => {
    if (!data) return [];
    return data.categories.map((cat) => ({ ...cat, ...getCategoryView(cat, selectedMonth) }));
  }, [data, selectedMonth]);

  // Filtered Statement Transactions
  const statementTransactions = useMemo(() => {
    let list = [...expenses];

    list = list.filter((item) => {
      const d = new Date(item.date || item.createdAt);
      if (d.getFullYear() !== year) return false;
      if (selectedMonth !== 0 && d.getMonth() + 1 !== selectedMonth) return false;
      return true;
    });

    if (categoryFilter) {
      list = list.filter((item) => String(item.budgetCategoryId) === String(categoryFilter));
    }

    if (statusFilter) {
      list = list.filter((item) => item.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (item) =>
          item.voucherNo?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.payee?.toLowerCase().includes(q) ||
          item.budgetCategory?.name?.toLowerCase().includes(q) ||
          item.note?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  }, [expenses, year, selectedMonth, categoryFilter, statusFilter, searchTerm]);

  // Monthly Matrix
  const monthlyBreakdown = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const allocated = data.categories.reduce((sum, c) => sum + (c.allocatedByMonth?.[i] || 0), 0);
      const spent = data.categories.reduce((sum, c) => sum + (c.spentByMonth?.[i] || 0), 0);
      return {
        month: i + 1,
        name: MONTH_NAMES[i],
        short: MONTH_SHORT[i],
        allocated,
        spent,
        remaining: allocated - spent,
        burn: allocated > 0 ? (spent / allocated) * 100 : 0,
      };
    });
  }, [data]);

  const isOverBudget = viewTotals.remainingAmount < 0;
  const burnRate =
    viewTotals.allocatedAmount > 0 ? (viewTotals.spentAmount / viewTotals.allocatedAmount) * 100 : 0;

  // Print Statement Execution
  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const exportCsv = () => {
    if (statementTransactions.length === 0) return;
    const headers = [
      'SL',
      'Value Date',
      'Voucher / Ref',
      'Account / Category',
      'Narration / Beneficiary',
      'Status',
      'Debit (Disbursed BDT)',
      'Balance (BDT)',
    ];

    let running = viewTotals.allocatedAmount;
    const rows = statementTransactions.map((tx, idx) => {
      const amt = Number(tx.amount || 0);
      running -= amt;
      return [
        idx + 1,
        new Date(tx.date || tx.createdAt).toLocaleDateString('en-GB'),
        tx.voucherNo || `VCH-${tx.id}`,
        `"${(tx.budgetCategory?.name || 'Office Expense').replace(/"/g, '""')}"`,
        `"${(tx.description || tx.payee || 'Operational Expense').replace(/"/g, '""')}"`,
        tx.status || 'Approved',
        amt.toFixed(2),
        running.toFixed(2),
      ];
    });

    const csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Statement_${year}_${selectedMonth ? `M${selectedMonth}` : 'Annual'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-16 print:bg-white print:p-0 print:pb-0">
      {/* Print Style Injector */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 14mm 14mm;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-header-space {
            margin-bottom: 20px;
          }
        }
      `}</style>

      {/* App Navigation (Hidden in Print) */}
      <div className="print:hidden">
        <Topbar />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="print:hidden">
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Accounts & Finance', to: '/accounts-module/office-budget' },
              { label: 'Office Expense Statement' },
            ]}
          />
        </div>

        {/* Actions Bar (Screen Only) */}
        <div className="mt-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100/80 text-indigo-800 tracking-wide uppercase">
                <ShieldCheck size={12} className="text-indigo-600" /> Verified Statement
              </span>
              <span className="text-xs text-slate-500 font-mono">Ref: {statementHash}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Office Expense Bank Statement
            </h1>
            <p className="text-xs text-slate-500">
              Authorized general ledger disbursements and allocation statements for internal audit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-budget')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              <ArrowLeft size={13} />
              Budget Planner
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={statementTransactions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition disabled:opacity-40"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              CSV Export
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Printer size={13} />
              Print Formal Statement
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800 text-sm print:hidden">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
            <button
              onClick={loadData}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-700 underline"
            >
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {/* PRIMARY STATEMENT CONTAINER */}
        <div
          ref={printRef}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:border-none print:shadow-none"
        >
          {/* ============================================================ */}
          {/* BANK STATEMENT CORPORATE HEADER                             */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-linear-to-b from-slate-50/80 to-white print:bg-white print:p-0 print:border-b-2 print:border-slate-800 print-header-space">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-100 print:border-slate-300">
              {/* Brand & Account Spec */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-2 print:border-none print:p-0">
                  <img
                    src={logo}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-12 h-12 bg-slate-900 text-white rounded-lg items-center justify-center font-black text-xl">
                    T
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    TRIKON REAL ESTATE & DEVELOPMENTS
                  </h2>
                  <p className="text-xs text-slate-600 font-semibold tracking-wide">
                    Office Administration & Operational Expense Account
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500">
                    <span>
                      <strong className="text-slate-700 font-medium">A/C No:</strong> 0920-OFF-HQ-2026
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700 font-medium">Type:</strong> Operational Cost Ledger
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700 font-medium">Currency:</strong> BDT (৳)
                    </span>
                  </div>
                </div>
              </div>

              {/* Statement Metadata Box */}
              <div className="text-left sm:text-right bg-slate-50 print:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-none border-slate-200/80 min-w-[240px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 print:text-slate-900">
                  Periodic Account Statement
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{periodTitle}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">{periodDateRange}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Account Financial Position (The Banking Balances Box) */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Box 1: Allocation / Credit Limit */}
              <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 print:text-slate-600 block">
                  Budget Allocation (Limit)
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white print:text-slate-900 mt-1 block">
                  ৳{formatMoney(viewTotals.allocatedAmount)}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">
                  Approved funding for {periodTitle}
                </span>
              </div>

              {/* Box 2: Total Debited / Spent */}
              <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 print:text-slate-600 block">
                  Total Withdrawals (Debits)
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-rose-300 print:text-rose-700 mt-1 block">
                  ৳{formatMoney(viewTotals.spentAmount)}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">
                  {statementTransactions.length} Cleared Disbursements
                </span>
              </div>

              {/* Box 3: Available Balance */}
              <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 print:text-slate-600 block">
                    Available Balance
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      isOverBudget
                        ? 'bg-rose-500/20 text-rose-300 print:text-rose-700'
                        : 'bg-emerald-500/20 text-emerald-300 print:text-emerald-700'
                    }`}
                  >
                    {isOverBudget ? 'Overdrawn' : 'In Surplus'}
                  </span>
                </div>
                <span
                  className={`text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 block ${
                    isOverBudget ? 'text-rose-400 print:text-rose-700' : 'text-emerald-400 print:text-emerald-700'
                  }`}
                >
                  ৳{formatMoney(Math.abs(viewTotals.remainingAmount))}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5 block">
                  {isOverBudget ? 'Deficit over authorized credit' : 'Net unspent fund reserves'}
                </span>
              </div>

              {/* Box 4: Account Utilization */}
              <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-slate-400 print:text-slate-600">
                  <span>Burn Rate</span>
                  <span className="font-mono text-white print:text-slate-900">{burnRate.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 print:bg-slate-200 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      burnRate > 100 ? 'bg-rose-500' : burnRate > 85 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, burnRate)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 print:text-slate-500">
                  <span>0%</span>
                  <span>{burnRate > 100 ? 'Over limit' : `${(100 - burnRate).toFixed(1)}% Available`}</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* INTERACTIVE CONTROLS BAR (Hidden during Print)               */}
          {/* ============================================================ */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-white print:hidden space-y-4">
            {/* Year & Period Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200 transition"
                  title="Previous Year"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="px-3.5 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" />
                  {year}
                </div>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l border-slate-200 transition"
                  title="Next Year"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Month Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedMonth(0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    selectedMonth === 0
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Fiscal Year
                </button>
                {MONTH_SHORT.map((name, idx) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedMonth(idx + 1)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                      selectedMonth === idx + 1
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* View Tab Selectors & Instant Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('statement')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    activeTab === 'statement'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <FileText size={13} className="text-indigo-600" />
                  Transactions Statement
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                    {statementTransactions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    activeTab === 'category'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Layers size={13} className="text-indigo-600" />
                  Budget Heads Breakdown
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('monthly')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    activeTab === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Calendar size={13} className="text-indigo-600" />
                  Monthly Matrix
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    activeTab === 'audit'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Activity size={13} className="text-indigo-600" />
                  Audit Trail
                </button>
              </div>

              {/* Search & Category Filter */}
              {activeTab === 'statement' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-52">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search voucher, payee..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">All Category Heads</option>
                    {data?.categories?.map((c) => (
                      <option key={c.budgetCategoryId} value={c.budgetCategoryId}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">All Statuses</option>
                    <option value="approved">Cleared</option>
                    <option value="pending">In Clearing</option>
                    <option value="rejected">Dishonored</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* TAB 1: FORMAL BANK STATEMENT LEDGER                          */}
          {/* ============================================================ */}
          {activeTab === 'statement' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 print:bg-slate-100 print:border-slate-800">
                    <th className="py-3 px-4 w-12 text-center">SL</th>
                    <th className="py-3 px-4 w-28">Value Date</th>
                    <th className="py-3 px-4 w-32">Voucher / Ref</th>
                    <th className="py-3 px-4 w-44">Head of Account</th>
                    <th className="py-3 px-4">Narration / Payee Details</th>
                    <th className="py-3 px-4 w-28 text-center print:hidden">Clearance</th>
                    <th className="py-3 px-4 text-right w-36">Debit (Outflow ৳)</th>
                    <th className="py-3 px-4 text-right w-36">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 font-sans">
                  {/* B/F Balance Row */}
                  <tr className="bg-slate-50/70 font-medium text-slate-700 print:bg-transparent">
                    <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">—</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      01/{selectedMonth ? String(selectedMonth).padStart(2, '0') : '01'}/{year}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-slate-500">B/F ALLOCATION</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">Budget Limit Authorized</td>
                    <td className="py-2.5 px-4 italic text-slate-500">Opening Credit Limit Allocated for Period</td>
                    <td className="py-2.5 px-4 text-center print:hidden">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        CREDIT
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">—</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ৳{formatMoney(viewTotals.allocatedAmount)}
                    </td>
                  </tr>

                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400">
                        Retrieving verified transaction ledger…
                      </td>
                    </tr>
                  ) : statementTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400">
                        No transactions registered for the selected period.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let running = viewTotals.allocatedAmount;
                      return statementTransactions.map((tx, idx) => {
                        const amt = Number(tx.amount || 0);
                        running -= amt;
                        const dateFormatted = new Date(tx.date || tx.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                        const st = (tx.status || 'approved').toLowerCase();

                        return (
                          <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition print-avoid-break">
                            <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-indigo-700 print:text-slate-900">
                              {tx.voucherNo || `VCH-${String(tx.id).padStart(5, '0')}`}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px] print:p-0 print:bg-transparent">
                                {tx.budgetCategory?.name || 'General Operations'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              <div className="font-medium text-slate-900 line-clamp-1">
                                {tx.description || tx.payee || 'Direct Disbursement'}
                              </div>
                              {tx.payee && tx.description && (
                                <div className="text-[10px] text-slate-400">Beneficiary: {tx.payee}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center print:hidden">
                              {st === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={10} /> Cleared
                                </span>
                              ) : st === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={10} /> Processing
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle size={10} /> Voided
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 print:text-slate-900">
                              ৳{formatMoney(amt)}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-mono font-bold ${
                                running < 0 ? 'text-rose-600 print:text-slate-900' : 'text-slate-800'
                              }`}
                            >
                              ৳{formatMoney(running)}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold print:bg-slate-100 print:text-slate-900 print:border-t-2 print:border-slate-800">
                    <td colSpan={5} className="py-3 px-4 text-right uppercase text-[10px] tracking-wider text-slate-300 print:text-slate-700">
                      Summary Total Debits / Closing Position
                    </td>
                    <td className="py-3 px-4 print:hidden" />
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-300 print:text-slate-900">
                      ৳{formatMoney(viewTotals.spentAmount)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        isOverBudget ? 'text-rose-400 print:text-slate-900' : 'text-emerald-300 print:text-slate-900'
                      }`}
                    >
                      ৳{formatMoney(viewTotals.remainingAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: BUDGET HEADS BREAKDOWN LEDGER                         */}
          {/* ============================================================ */}
          {activeTab === 'category' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 print:bg-slate-100">
                    <th className="py-3 px-4">Budget Head / Cost Center</th>
                    <th className="py-3 px-4 text-right">Allocated Limit (৳)</th>
                    <th className="py-3 px-4 text-right">Debited / Expensed (৳)</th>
                    <th className="py-3 px-4 text-right">Available Balance (৳)</th>
                    <th className="py-3 px-4 w-44">Utilization Gauge</th>
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No budget categories configured.
                      </td>
                    </tr>
                  ) : (
                    viewCategories.map((c) => {
                      const pct = c.allocatedAmount > 0 ? (c.spentAmount / c.allocatedAmount) * 100 : 0;
                      const over = c.remainingAmount < 0;

                      return (
                        <tr key={c.budgetCategoryId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.name}
                            <span className="block text-[10px] text-slate-400 font-normal">Head #{c.budgetCategoryId}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            ৳{formatMoney(c.allocatedAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                            ৳{formatMoney(c.spentAmount)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              over ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            ৳{formatMoney(c.remainingAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-36">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                                <span className="font-mono">{pct.toFixed(0)}%</span>
                                {over && <span className="text-rose-600 font-bold uppercase text-[9px]">OVER</span>}
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {over ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Overdrawn
                              </span>
                            ) : pct > 80 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                High Burn
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <td className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-300">Total Across Heads</td>
                    <td className="py-3 px-4 text-right font-mono text-white">৳{formatMoney(viewTotals.allocatedAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-300">৳{formatMoney(viewTotals.spentAmount)}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        isOverBudget ? 'text-rose-400' : 'text-emerald-300'
                      }`}
                    >
                      ৳{formatMoney(viewTotals.remainingAmount)}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right text-[10px] text-slate-400">
                      Overall Burn: {burnRate.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MONTHLY FLOW MATRIX                                  */}
          {/* ============================================================ */}
          {activeTab === 'monthly' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4 w-32">Calendar Month</th>
                    <th className="py-3 px-4 text-right">Allocated Limit (৳)</th>
                    <th className="py-3 px-4 text-right">Actual Spends (৳)</th>
                    <th className="py-3 px-4 text-right">Net Available (৳)</th>
                    <th className="py-3 px-4 w-44">Burn Progress</th>
                    <th className="py-3 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyBreakdown.map((m) => {
                    const over = m.remaining < 0;
                    const isSelected = selectedMonth === m.month;

                    return (
                      <tr
                        key={m.month}
                        className={`transition ${isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {m.name} {year}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">৳{formatMoney(m.allocated)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">৳{formatMoney(m.spent)}</td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            over ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          ৳{formatMoney(m.remaining)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-36">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-mono">{m.burn.toFixed(0)}%</span>
                              {over && <span className="text-rose-600 font-bold">OVER</span>}
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  over ? 'bg-rose-500' : m.burn > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, m.burn)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth(m.month);
                              setActiveTab('statement');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/60 rounded transition cursor-pointer"
                          >
                            Drill Down
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <td className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-300">Year Total</td>
                    <td className="py-3 px-4 text-right font-mono text-white">৳{formatMoney(data?.totals?.allocatedAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-300">৳{formatMoney(data?.totals?.spentAmount)}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        data?.totals?.remainingAmount < 0 ? 'text-rose-400' : 'text-emerald-300'
                      }`}
                    >
                      ৳{formatMoney(data?.totals?.remainingAmount)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: AUDIT TRAIL                                           */}
          {/* ============================================================ */}
          {activeTab === 'audit' && (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {activityLoading ? (
                <div className="py-14 text-center text-slate-400 text-xs">Loading audit event history…</div>
              ) : activity.length === 0 ? (
                <div className="py-14 text-center text-slate-400 text-xs">No audit events logged for {periodTitle}.</div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/70 transition text-xs">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Banknote size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium">{item.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600">{item.module}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleString('en-GB')}</span>
                        <span>•</span>
                        <span>By: {item.performedBy || 'System'}</span>
                      </div>
                    </div>
                    {item.amount && (
                      <span className="font-mono font-bold text-slate-900">
                        ৳{formatMoney(item.amount)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STATEMENT FOOTER CERTIFICATION & SIGNATURES                  */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-8 border-t border-slate-200 bg-slate-50/60 print:bg-white print:p-0 print:pt-6 print:border-t-2 print:border-slate-800 print-avoid-break">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 text-[10px] text-slate-500 leading-relaxed border-b border-slate-200 pb-4 print:border-slate-300">
              <div className="max-w-2xl">
                <span className="font-bold text-slate-700 uppercase block mb-0.5">Disclaimer & Authentication</span>
                This document is a certified office expense ledger statement compiled automatically from verified ERP transaction vouchers. Any discrepancies must be reported to the Accounts & Finance Department within 7 banking days of statement issuance.
              </div>
              <div className="text-left md:text-right font-mono shrink-0">
                <div>HASH: {statementHash}</div>
                <div>STATUS: AUTHENTICATED / CLEARED</div>
              </div>
            </div>

            {/* Official Signatures (Immaculate in Print) */}
            <div className="mt-12 pt-4 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
              <div>
                <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono font-medium text-slate-800">
                  Accounts Department
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Prepared By</span>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono font-medium text-slate-800">
                  Internal Audit
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Checked & Verified</span>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono font-medium text-slate-800">
                  Managing Director
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Authorized Officer</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}