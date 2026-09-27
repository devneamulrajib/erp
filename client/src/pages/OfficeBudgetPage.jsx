// src/pages/OfficeBudgetPage.jsx
import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Wallet,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FileText,
  Pencil,
  Eye,
  Trash2,
  X,
  History,
  Clock,
  Plus,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  getMonthlyBudgetSummary,
  saveMonthlyBudget,
  deleteMonthlyBudget,
  getMonthlyBudgetLogs,
} from '../api/monthlyBudget';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const money = (val) =>
  Number(val || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function EditBudgetModal({ row, year, month, onClose, onSaved }) {
  const [amount, setAmount] = useState(row.allocatedAmount || 0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isNew = !row.monthlyBudgetId;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await saveMonthlyBudget({
        budgetCategoryId: row.budgetCategoryId,
        year,
        month,
        allocatedAmount: Number(amount) || 0,
        note,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save allocation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-0.5">
          {isNew ? 'Set Budget' : 'Edit Budget'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Monthly Allocation (৳)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why is this being set or changed?"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
            >
              {submitting ? 'Saving…' : isNew ? 'Set Budget' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetLogModal({ row, year, month, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMonthlyBudgetLogs(row.budgetCategoryId, year, month)
      .then(setLogs)
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false));
  }, [row.budgetCategoryId, year, month]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
            <History size={16} />
          </span>
          <h2 className="text-base font-bold text-slate-900">Budget Change History</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No changes recorded yet for this period.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.action === 'Created'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.action === 'Deleted'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={11} />
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-700 pt-0.5">
                  {log.action === 'Deleted' ? (
                    <>
                      Removed allocation of <strong className="font-semibold">৳{money(log.previousAmount)}</strong>
                    </>
                  ) : log.action === 'Created' ? (
                    <>
                      Set allocation to <strong className="font-semibold">৳{money(log.newAmount)}</strong>
                    </>
                  ) : (
                    <>
                      Changed allocation from <span className="font-semibold">৳{money(log.previousAmount)}</span> to{' '}
                      <strong className="font-semibold">৳{money(log.newAmount)}</strong>
                    </>
                  )}
                </p>
                {log.note && <p className="text-[11px] text-slate-500 italic">"{log.note}"</p>}
                <p className="text-[10px] text-slate-400 text-right">By {log.performedBy || 'Admin'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function OfficeBudgetPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [viewingLogsRow, setViewingLogsRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyBudgetSummary(year, month);
      setRows(data.rows || []);
      setTotals(data.totals || { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 });
    } catch (err) {
      console.error('Failed to load budget summary', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  async function handleDelete(row) {
    if (!row.monthlyBudgetId) return;
    if (!window.confirm(`Remove the ৳${money(row.allocatedAmount)} allocation for ${row.name}?`)) return;
    setDeletingId(row.monthlyBudgetId);
    try {
      await deleteMonthlyBudget(row.monthlyBudgetId);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete allocation');
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpanded(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, search]);

  const totalBurnRate =
    totals.allocatedAmount > 0
      ? Math.min(100, (totals.spentAmount / totals.allocatedAmount) * 100)
      : 0;

  const remainingHealth =
    totals.allocatedAmount > 0
      ? Math.max(0, Math.min(100, (totals.remainingAmount / totals.allocatedAmount) * 100))
      : 100;

  const allWithinBudget = rows.every((r) => (r.remainingAmount || 0) >= 0);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <Topbar />

      {/* Main Container: Full width matching Topbar with generous padding */}
      <main className="w-full px-4 sm:px-6 lg:px-10 py-5 space-y-5">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Office Budget' },
          ]}
        />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Office Budget
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Allocate monthly spending limits per category and track expenditures
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-expense-list')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <FileText size={15} className="text-slate-400" />
              Expense Ledger
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/accounts-module/budget-categories')}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
            >
              <Settings size={15} />
              Manage Categories
            </button>
          </div>
        </div>

        {/* Budget Month Selector Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:px-6 sm:py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Budget Month
              </p>
              <p className="text-sm font-bold text-slate-900">
                {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Seamless Month-Year Selector Dropdown */}
            <div className="relative inline-flex items-center border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-2xs">
              <select
                value={`${month}-${year}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-');
                  setMonth(Number(m));
                  setYear(Number(y));
                }}
                className="appearance-none bg-transparent text-xs font-bold text-slate-800 pr-5 focus:outline-none cursor-pointer"
              >
                {/* 2 years back and 2 years forward */}
                {[-1, 0, 1].map((yearOffset) => {
                  const targetYear = now.getFullYear() + yearOffset;
                  return MONTH_NAMES.map((mName, mIdx) => (
                    <option key={`${mIdx + 1}-${targetYear}`} value={`${mIdx + 1}-${targetYear}`}>
                      {mName} {targetYear}
                    </option>
                  ));
                })}
              </select>
              <ChevronDown size={13} className="text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (rows.length > 0) setEditingRow(rows[0]);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition ml-1"
            >
              <Plus size={14} />
              Create Month
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: TOTAL ALLOCATED */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[126px]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Wallet size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Allocated
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                ৳{money(totals.allocatedAmount)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Across {rows.length} categories
              </span>
            </div>
          </div>

          {/* Card 2: TOTAL SPENT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[126px]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight">
                ৳{money(totals.spentAmount)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {totalBurnRate.toFixed(0)}% of total budget
              </span>
            </div>
          </div>

          {/* Card 3: REMAINING BALANCE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-[126px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Remaining Balance
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20">
                <TrendingUp size={11} /> {remainingHealth.toFixed(0)}% Healthy
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                ৳{money(totals.remainingAmount)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Available to spend
              </span>
            </div>
          </div>
        </div>

        {/* Category Allocations Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 sm:px-6 sm:py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Category Allocations
              </h2>
              <p className="text-xs text-slate-400 font-normal">
                {rows.length} budget heads defined
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories"
                  className="w-48 sm:w-64 h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <button
                type="button"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition"
                title="Filters"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6 min-w-[240px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Budget</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Spent</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Remaining</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Budget Utilization</th>
                  <th className="py-3.5 pr-6 pl-2 min-w-[210px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-xs">
                      Loading budget entries...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-xs">
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const allocated = row.allocatedAmount || 0;
                    const spent = row.spentAmount || 0;
                    const remaining = row.remainingAmount || 0;
                    const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
                    const overBudget = remaining < 0;
                    const hasSubs = row.subcategories && row.subcategories.length > 0;
                    const isOpen = !!expanded[row.budgetCategoryId];

                    let statusLabel = 'On track';
                    let statusColor = 'text-emerald-600';
                    let barColor = 'bg-emerald-500';

                    if (spent === 0) {
                      statusLabel = 'Not used';
                      statusColor = 'text-slate-400';
                      barColor = 'bg-slate-200';
                    } else if (overBudget) {
                      statusLabel = 'Over budget';
                      statusColor = 'text-rose-600';
                      barColor = 'bg-rose-500';
                    } else if (pct > 80) {
                      statusLabel = 'High spend';
                      statusColor = 'text-amber-600';
                      barColor = 'bg-amber-500';
                    }

                    return (
                      <Fragment key={row.budgetCategoryId}>
                        <tr className="hover:bg-slate-50/60 transition">
                          {/* Category Name & Icon */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {hasSubs ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(row.budgetCategoryId)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                                >
                                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              ) : (
                                <span className="w-5 shrink-0" />
                              )}

                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Folder size={17} />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {row.name}
                                </p>
                                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                  {row.description || 'General office operations'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Budget */}
                          <td className="py-4 px-4 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                            ৳{money(allocated)}
                          </td>

                          {/* Spent */}
                          <td className="py-4 px-4 font-semibold text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                            ৳{money(spent)}
                          </td>

                          {/* Remaining */}
                          <td className="py-4 px-4 font-bold text-xs sm:text-sm whitespace-nowrap">
                            <span className={overBudget ? 'text-rose-600' : 'text-emerald-600'}>
                              ৳{money(remaining)}
                            </span>
                          </td>

                          {/* Budget Utilization Progress Bar */}
                          <td className="py-4 px-4">
                            <div className="w-full max-w-[150px]">
                              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                                <span className={statusColor}>{statusLabel}</span>
                                <span className="font-bold text-slate-700">
                                  {pct.toFixed(pct % 1 === 0 ? 0 : 2)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Action Buttons: Full Width, Never Cut Off */}
                          <td className="py-4 pr-6 pl-2 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingLogsRow(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition whitespace-nowrap"
                              >
                                <Eye size={13} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingRow(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200/80 transition whitespace-nowrap"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                disabled={!row.monthlyBudgetId || deletingId === row.monthlyBudgetId}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Nested Subcategories */}
                        {isOpen &&
                          hasSubs &&
                          row.subcategories.map((sub) => (
                            <tr key={sub.budgetCategoryId} className="bg-slate-50/50">
                              <td className="py-2.5 px-6 pl-14 text-xs text-slate-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                {sub.name}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">—</td>
                              <td className="py-2.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                ৳{money(sub.spentAmount)}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">—</td>
                              <td className="py-2.5 px-4 text-xs text-slate-400 font-mono">—</td>
                              <td className="py-2.5 pr-6 pl-2" />
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Banner */}
          <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>
                {allWithinBudget
                  ? 'All category budgets are within their allocated limits.'
                  : 'Some category budgets require review.'}
              </span>
            </div>
            <span className="text-slate-400">
              Showing {filteredRows.length} of {rows.length} categories
            </span>
          </div>
        </div>
      </main>

      {/* Edit Budget Modal */}
      {editingRow && (
        <EditBudgetModal
          row={editingRow}
          year={year}
          month={month}
          onClose={() => setEditingRow(null)}
          onSaved={load}
        />
      )}

      {/* Budget History Modal */}
      {viewingLogsRow && (
        <BudgetLogModal
          row={viewingLogsRow}
          year={year}
          month={month}
          onClose={() => setViewingLogsRow(null)}
        />
      )}
    </div>
  );
}