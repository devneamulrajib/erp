import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertCircle, Wallet, FileSpreadsheet,
  ChevronLeft, ChevronRight, Award, PieChart, CalendarDays,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getOfficeExpenseReport } from '../api/officeExpense';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const money = (v) => Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  approved: 'bg-emerald-500',
  pending: 'bg-amber-500',
  rejected: 'bg-rose-500',
};

// selectedMonth: 0 = whole year, 1-12 = that month's own numbers
function getCategoryView(cat, selectedMonth) {
  if (selectedMonth === 0) {
    return {
      allocatedAmount: cat.allocatedAmount,
      spentAmount: cat.spentAmount,
      remainingAmount: cat.remainingAmount,
    };
  }
  const idx = selectedMonth - 1;
  const allocatedAmount = cat.allocatedByMonth?.[idx] || 0;
  const spentAmount = cat.spentByMonth?.[idx] || 0;
  return { allocatedAmount, spentAmount, remainingAmount: allocatedAmount - spentAmount };
}

export default function OfficeReportPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Full Year
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOfficeExpenseReport(year);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load office report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // Reset month filter whenever the year changes, so you don't silently
  // stay on "October" after jumping to a year you haven't looked at yet.
  useEffect(() => { setSelectedMonth(0); }, [year]);

  // Per-month totals across ALL categories — powers the new Monthly
  // Breakdown table below. Derived from each category's own
  // allocatedByMonth/spentByMonth arrays, since the backend doesn't
  // send a pre-summed monthly total for allocation (only spend).
  const monthlyBreakdown = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const allocatedAmount = data.categories.reduce((sum, c) => sum + (c.allocatedByMonth?.[i] || 0), 0);
      const spentAmount = data.categories.reduce((sum, c) => sum + (c.spentByMonth?.[i] || 0), 0);
      return {
        month: i + 1,
        label: MONTH_LABELS[i],
        allocatedAmount,
        spentAmount,
        remainingAmount: allocatedAmount - spentAmount,
      };
    });
  }, [data]);

  // The view totals that drive the KPI cards + category table, switching
  // between the full-year numbers and a single selected month's numbers.
  const viewTotals = useMemo(() => {
    if (!data) return { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 };
    if (selectedMonth === 0) return data.totals;
    return data.categories.reduce((acc, cat) => {
      const v = getCategoryView(cat, selectedMonth);
      return {
        allocatedAmount: acc.allocatedAmount + v.allocatedAmount,
        spentAmount: acc.spentAmount + v.spentAmount,
        remainingAmount: acc.remainingAmount + v.remainingAmount,
      };
    }, { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 });
  }, [data, selectedMonth]);

  const viewCategories = useMemo(() => {
    if (!data) return [];
    return data.categories.map((cat) => ({ ...cat, ...getCategoryView(cat, selectedMonth) }));
  }, [data, selectedMonth]);

  const viewTopSpenders = useMemo(() => {
    return [...viewCategories].sort((a, b) => b.spentAmount - a.spentAmount).slice(0, 5);
  }, [viewCategories]);

  const periodLabel = selectedMonth === 0 ? `Full Year ${year}` : `${MONTH_LABELS_FULL[selectedMonth - 1]} ${year}`;

  function exportCsv() {
    if (!data) return;
    const headers = ['Category', `Allocated (${periodLabel})`, `Spent (${periodLabel})`, 'Remaining', 'Burn %'];
    const rows = viewCategories.map((c) => {
      const pct = c.allocatedAmount > 0 ? ((c.spentAmount / c.allocatedAmount) * 100).toFixed(1) : '—';
      return [c.name, c.allocatedAmount, c.spentAmount, c.remainingAmount, pct];
    });
    rows.push(['Total', viewTotals.allocatedAmount, viewTotals.spentAmount, viewTotals.remainingAmount, '']);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-report-${year}${selectedMonth ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isOverBudget = viewTotals.remainingAmount < 0;
  const burnRate = viewTotals.allocatedAmount > 0 ? Math.min(100, (viewTotals.spentAmount / viewTotals.allocatedAmount) * 100) : 0;
  const statusTotals = data?.statusTotals || {};
  const statusTotalSum = Object.values(statusTotals).reduce((s, v) => s + v, 0) || 1;

  function selectMonth(m) {
    setSelectedMonth((current) => (current === m ? 0 : m));
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800">
      <Topbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Office Report' },
          ]}
        />

        <div className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Office Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Office budget allocation vs. spend, by category — {periodLabel}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-40"
            >
              <FileSpreadsheet size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-budget')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
            >
              <ArrowLeft size={13} /> Budget Tracker
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Year selector */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-r border-slate-200 transition"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-4 py-1.5 text-sm font-bold text-slate-800">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-l border-slate-200 transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setYear(new Date().getFullYear())}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
          >
            Current Year
          </button>
        </div>

        {/* Month selector */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-4 py-3 mb-6 flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pr-1">
            <CalendarDays size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Period</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMonth(0)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedMonth === 0 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            Full Year
          </button>
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => selectMonth(i + 1)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedMonth === i + 1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-20 text-center text-slate-400 text-sm">
            Loading report…
          </div>
        ) : !data ? null : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Allocated</div>
                <div className="mt-2 text-2xl font-bold font-mono text-slate-900">৳{money(viewTotals.allocatedAmount)}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{periodLabel}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Total Spent</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{burnRate.toFixed(1)}%</span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-slate-900">৳{money(viewTotals.spentAmount)}</div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : burnRate > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${burnRate}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Remaining</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isOverBudget ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isOverBudget ? <AlertCircle size={10} /> : <TrendingUp size={10} />}
                    {isOverBudget ? 'Over' : 'On Track'}
                  </span>
                </div>
                <div className={`mt-2 text-2xl font-bold font-mono flex items-center gap-1.5 ${isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {isOverBudget ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                  ৳{money(Math.abs(viewTotals.remainingAmount))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Entries Logged</div>
                <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{data.entryCount}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Office expense records in {year} (full year)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 mb-6">
              {/* Monthly trend */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-800">Monthly Spend Trend — {year}</h2>
                </div>
                <div className="p-5">
                  <YearTrendChart values={data.monthlyTrend} selectedMonth={selectedMonth} onSelectMonth={selectMonth} />
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <PieChart size={14} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-800">By Status (Full Year)</h2>
                </div>
                <div className="p-5 space-y-3">
                  {Object.keys(statusTotals).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No entries yet for {year}</p>
                  ) : (
                    Object.entries(statusTotals).map(([status, amt]) => {
                      const pct = (amt / statusTotalSum) * 100;
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="capitalize font-medium text-slate-700">{status}</span>
                            <span className="font-mono text-slate-500">৳{money(amt)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${STATUS_COLORS[status] || 'bg-slate-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Monthly breakdown table (new) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Monthly Breakdown — {year}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click a row to filter the category table below to that month</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Allocated</th>
                      <th className="py-3 px-4">Spent</th>
                      <th className="py-3 px-4">Remaining</th>
                      <th className="py-3 px-4 w-40">Burn Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyBreakdown.map((m) => {
                      const pct = m.allocatedAmount > 0 ? Math.min(100, (m.spentAmount / m.allocatedAmount) * 100) : 0;
                      const overBudget = m.remainingAmount < 0;
                      const active = selectedMonth === m.month;
                      return (
                        <tr
                          key={m.month}
                          onClick={() => selectMonth(m.month)}
                          className={`cursor-pointer transition ${active ? 'bg-indigo-50/70' : 'hover:bg-slate-50/70'}`}
                        >
                          <td className={`py-3 px-4 font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{m.label}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">৳{money(m.allocatedAmount)}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">৳{money(m.spentAmount)}</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={overBudget ? 'text-rose-600' : 'text-slate-800'}>৳{money(m.remainingAmount)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-32">
                              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                <span className="font-mono font-medium text-slate-600">{pct.toFixed(0)}%</span>
                                {overBudget && <span className="text-rose-600 font-bold uppercase">Over</span>}
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/70 font-semibold border-t border-indigo-100">
                      <td className="py-3 px-4 text-slate-700">Year Total</td>
                      <td className="py-3 px-4 font-mono text-indigo-700">৳{money(data.totals.allocatedAmount)}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700">৳{money(data.totals.spentAmount)}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700">৳{money(data.totals.remainingAmount)}</td>
                      <td className="py-3 px-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Top spending categories */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Award size={14} className="text-slate-400" />
                <h2 className="text-sm font-bold text-slate-800">Top Spending Categories — {periodLabel}</h2>
              </div>
              <div className="p-5">
                {viewTopSpenders.length === 0 || viewTopSpenders.every((c) => c.spentAmount === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6">No spend recorded for {periodLabel}</p>
                ) : (
                  <div className="space-y-3">
                    {viewTopSpenders.map((c, i) => {
                      const maxSpend = viewTopSpenders[0].spentAmount || 1;
                      const pct = (c.spentAmount / maxSpend) * 100;
                      return (
                        <div key={c.budgetCategoryId} className="flex items-center gap-3">
                          <span className="w-5 text-xs font-bold text-slate-400">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-800">{c.name}</span>
                              <span className="font-mono text-slate-600">৳{money(c.spentAmount)}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Category breakdown table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-800">Category Breakdown — {periodLabel}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{viewCategories.length} budget heads</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Allocated ({selectedMonth === 0 ? 'Year' : MONTH_LABELS[selectedMonth - 1]})</th>
                      <th className="py-3 px-4">Spent ({selectedMonth === 0 ? 'Year' : MONTH_LABELS[selectedMonth - 1]})</th>
                      <th className="py-3 px-4">Remaining</th>
                      <th className="py-3 px-4 w-44">Burn Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Wallet size={22} strokeWidth={1.5} />
                            <p className="text-sm">No budget categories defined</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      viewCategories.map((c) => {
                        const pct = c.allocatedAmount > 0 ? Math.min(100, (c.spentAmount / c.allocatedAmount) * 100) : 0;
                        const overBudget = c.remainingAmount < 0;
                        return (
                          <tr key={c.budgetCategoryId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">৳{money(c.allocatedAmount)}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">৳{money(c.spentAmount)}</td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={overBudget ? 'text-rose-600' : 'text-slate-800'}>৳{money(c.remainingAmount)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-36">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                  <span className="font-mono font-medium text-slate-600">{pct.toFixed(0)}%</span>
                                  {overBudget && <span className="text-rose-600 font-bold uppercase">Over</span>}
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {viewCategories.length > 0 && (
                    <tfoot>
                      <tr className="bg-indigo-50/70 font-semibold border-t border-indigo-100">
                        <td className="py-3 px-4 text-slate-700">Total</td>
                        <td className="py-3 px-4 font-mono text-indigo-700">৳{money(viewTotals.allocatedAmount)}</td>
                        <td className="py-3 px-4 font-mono text-indigo-700">৳{money(viewTotals.spentAmount)}</td>
                        <td className="py-3 px-4 font-mono text-indigo-700">৳{money(viewTotals.remainingAmount)}</td>
                        <td className="py-3 px-4" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function YearTrendChart({ values, selectedMonth, onSelectMonth }) {
  const width = 760;
  const height = 140;
  const padding = 10;
  const max = Math.max(...values, 1);

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
        <defs>
          <linearGradient id="yearTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#yearTrendFill)" />
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={selectedMonth === i + 1 ? 5 : 3}
            fill="#4f46e5"
            stroke={selectedMonth === i + 1 ? '#312e81' : 'none'}
            strokeWidth={selectedMonth === i + 1 ? 2 : 0}
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {MONTH_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectMonth?.(i + 1)}
            className="text-center group"
          >
            <p className={`text-[10px] transition ${selectedMonth === i + 1 ? 'text-indigo-600 font-bold' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {label}
            </p>
            <p className={`text-[10px] font-medium transition ${selectedMonth === i + 1 ? 'text-indigo-700' : 'text-slate-600'}`}>
              ৳{(values[i] / 1000).toFixed(0)}k
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}