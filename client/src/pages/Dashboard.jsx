import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  ClipboardList,
  Download,
  Landmark,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  Clock3,
  FileText,
  CheckCircle2,
  TrendingUp,
  Layers,
  Banknote,
  UserCheck,
  Truck,
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ExpenseDonut from '../components/ExpenseDonut';
import InflowOutflowChart from '../components/InflowOutflowChart';
import CommentsTable from '../components/CommentsTable';

const RANGES = [
  { key: '30d', label: '30 Days' },
  { key: '6m', label: '6 Months' },
  { key: '12m', label: '12 Months' },
];
const RANGE_MONTHS = { '30d': 1, '6m': 6, '12m': 12 };

const EXPENSE_COLORS = ['#174d36', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#264653'];

const money = (value) =>
  `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString('en-BD');

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [projects, setProjects] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [properties, setProperties] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);
  const [officeOverview, setOfficeOverview] = useState(null);
  const [range, setRange] = useState('12m');
  const [approvingId, setApprovingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    setSummaryError('');
    const requests = [
      api.get('/dashboard/summary').then((r) => setSummary(r.data)).catch((e) =>
        setSummaryError(e.response?.data?.message || 'Unable to load dashboard summary.')
      ),
      api.get('/dashboard/projects').then((r) => setProjects(Array.isArray(r.data) ? r.data : [])).catch(() => setProjects([])),
      api.get('/dashboard/bank-balances').then((r) =>
        setBanks({ accounts: Array.isArray(r.data?.accounts) ? r.data.accounts : [], total: r.data?.total ?? 0 })
      ).catch(() => setBanks({ accounts: [], total: 0 })),
      api.get('/dashboard/unsold-properties').then((r) => setProperties(Array.isArray(r.data) ? r.data : [])).catch(() => setProperties([])),
      api.get('/dashboard/pending-vouchers').then((r) => setVouchers(Array.isArray(r.data) ? r.data : [])).catch(() => setVouchers([])),
      api.get('/dashboard/comments').then((r) => setComments(Array.isArray(r.data) ? r.data : [])).catch(() => setComments([])),
      api.get('/dashboard/office-overview').then((r) => setOfficeOverview(r.data)).catch(() => setOfficeOverview(null)),
    ];
    await Promise.all(requests);
    if (showRefresh) setRefreshing(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const months = RANGE_MONTHS[range] || 12;
    Promise.all([
      api.get(`/dashboard/expense-chart?months=${months}`).then((r) => {
        if (!cancelled) setExpenseChart(Array.isArray(r.data) ? r.data : []);
      }).catch(() => { if (!cancelled) setExpenseChart([]); }),
      api.get(`/dashboard/inflow-outflow?months=${months}`).then((r) => {
        if (!cancelled) setFlow(r.data || { labels: [], inflow: [], outflow: [] });
      }).catch(() => { if (!cancelled) setFlow({ labels: [], inflow: [], outflow: [] }); }),
    ]);
    return () => { cancelled = true; };
  }, [range]);

  const requisitionsTotal =
    (Number(summary?.materialReq) || 0) + (Number(summary?.serviceReq) || 0) ||
    summary?.requisitions || 0;

  const expenseTotal = useMemo(
    () => expenseChart.reduce((sum, item) => sum + Number(item.value ?? item.amount ?? item.total ?? 0), 0),
    [expenseChart]
  );

  const officeTotals = officeOverview?.officeTotals || {
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
  };

  const officeSpentPct =
    Number(officeTotals.allocatedAmount) > 0
      ? Math.min(100, Math.round((Number(officeTotals.spentAmount) / Number(officeTotals.allocatedAmount)) * 100))
      : 0;

  const netPosition = Number(summary?.receipt || 0) - Number(summary?.expenses || 0);

  async function handleApproveVoucher(id) {
    if (!id) return;
    setApprovingId(id);
    try {
      await api.patch(`/dashboard/pending-vouchers/${id}/approve`);
      setVouchers((prev) => prev.filter((v) => v._id !== id));
    } catch (error) {
      window.alert(error.response?.data?.message || 'Failed to approve voucher');
    } finally {
      setApprovingId(null);
    }
  }

  function handleExportReport() {
    const months = RANGE_MONTHS[range] || 12;
    const rows = [
      ['Metric', 'Value'],
      ['Net Receipts', summary?.receipt ?? ''],
      ['Gross Sales', summary?.sales ?? ''],
      ['Total Expenses', summary?.expenses ?? ''],
      ['Requisitions', requisitionsTotal ?? ''],
      ['Liquid Treasury', banks.total ?? ''],
      [],
      [`Expense Breakdown (last ${months} months)`],
      ['Category', 'Total'],
      ...expenseChart.map((item) => [
        item.name ?? item.category ?? 'Category',
        item.value ?? item.amount ?? item.total ?? 0,
      ]),
    ];
    const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#f0f5f2]">
        <Topbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          {summaryError ? (
            <>
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle className="size-7" />
              </div>
              <h1 className="text-lg font-bold text-slate-800">Dashboard couldn’t load</h1>
              <p className="mt-2 max-w-sm text-center text-sm text-slate-500">{summaryError}</p>
              <button
                onClick={() => loadDashboard(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#174d36] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#174d36]/25"
              >
                <RefreshCw className="size-4" /> Try again
              </button>
            </>
          ) : (
            <>
              <div className="size-10 animate-spin rounded-full border-[3px] border-[#174d36]/20 border-t-[#174d36]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Loading your business overview…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f5f2] text-slate-800">
      <Topbar />

      {/* HEADER CONTROL BAR */}
      <div className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#174d36]">
                Executive Command Center
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex rounded-xl bg-slate-100 p-1">
              {RANGES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    range === item.key
                      ? 'bg-[#174d36] text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:border-emerald-300 hover:text-[#174d36] disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:border-emerald-300 hover:text-[#174d36]"
            >
              <Download className="size-3.5" />
              Export
            </button>
            <button
              onClick={() => navigate('/requisition-module/material-requisition-add')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#174d36] to-[#2a9d8f] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-700/25"
            >
              <Plus className="size-3.5" />
              New Requisition
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] space-y-4 p-4">

        {/* ===== TOP STRIP ===== */}
        <div className="grid grid-cols-12 gap-4">

          {/* ===== LIQUID TREASURY - Completely Redesigned ===== */}
          <div className="col-span-12 rounded-2xl border border-emerald-200/60 bg-white shadow-sm sm:col-span-5 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#174d36] text-white">
                  <ShieldCheck className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Liquid Treasury</p>
                  <p className="text-[11px] text-slate-400">{banks.accounts.length} linked accounts</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/accounts-module')}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#174d36] hover:bg-emerald-100"
              >
                Manage →
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-[13px] font-medium text-slate-500">Total Available Balance</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#174d36] tabular-nums">
                {money(banks.total)}
              </p>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Account Breakdown
              </p>
              <div className="space-y-2.5">
                {banks.accounts.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">No bank accounts linked</p>
                ) : (
                  banks.accounts.slice(0, 4).map((acc, i) => (
                    <div
                      key={acc._id || i}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {acc.bank || 'Bank Account'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {acc.type || 'Account'} ···{String(acc.number || '').slice(-4)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                        {money(acc.balance)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Period Performance */}
          <div className="col-span-12 grid grid-cols-2 gap-3 sm:col-span-7 lg:col-span-5">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-[#174d36]">
                  <ArrowUpRight className="size-4" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  Receipts
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{money(summary.receipt)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Collected this period</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <ArrowDownRight className="size-4" />
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                  Expenses
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{money(summary.expenses)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Recorded this period</p>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-100 bg-gradient-to-r from-white via-white to-emerald-50/40 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Net Position</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${netPosition >= 0 ? 'text-[#174d36]' : 'text-rose-600'}`}>
                    {money(netPosition)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500">Office Budget Used</p>
                  <p className="text-sm font-bold tabular-nums text-slate-800">{officeSpentPct}%</p>
                  <div className="mt-1.5 h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${officeSpentPct >= 90 ? 'bg-rose-500' : 'bg-[#174d36]'}`}
                      style={{ width: `${officeSpentPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-3">
            <button
              onClick={() => navigate('/project-module/projects')}
              className="flex flex-col items-start rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Building2 className="size-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{projects.length}</p>
              <p className="text-[11px] font-medium text-slate-500">Active Projects</p>
            </button>

            <button
              onClick={() => navigate('/crm-module/lead')}
              className="flex flex-col items-start rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <PackageCheck className="size-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{properties.length}</p>
              <p className="text-[11px] font-medium text-slate-500">Unsold Units</p>
            </button>

            <button
              onClick={() => navigate('/accounts-module')}
              className="flex flex-col items-start rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <ClipboardList className="size-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{number(requisitionsTotal)}</p>
              <p className="text-[11px] font-medium text-slate-500">Requisitions</p>
            </button>

            <button
              onClick={() => navigate('/accounts-module')}
              className="flex flex-col items-start rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Clock3 className="size-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{vouchers.length}</p>
              <p className="text-[11px] font-medium text-slate-500">Pending Approvals</p>
            </button>
          </div>
        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-12 gap-4">

          {/* LEFT */}
          <div className="col-span-12 space-y-4 lg:col-span-4">

            {/* CASH FLOW - Larger & better proportion */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-[#174d36]">
                    <TrendingUp className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Cash Flow</p>
                    <p className="text-[11px] text-slate-400">Inflow vs Outflow · {RANGES.find(r => r.key === range)?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#174d36]" /> Inflow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#e9c46a]" /> Outflow
                  </span>
                </div>
              </div>
              <div className="h-[260px] p-4">
                <InflowOutflowChart
                  labels={flow.labels || []}
                  inflow={flow.inflow || []}
                  outflow={flow.outflow || []}
                />
              </div>
            </div>

            {/* EXPENSE MIX - Redesigned to show more data + clear ৳ */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Layers className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Expense Mix</p>
                    <p className="text-[11px] text-slate-400">
                      Total: <span className="font-semibold text-slate-700">{money(expenseTotal)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {expenseChart.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No expense data for this period</p>
                ) : (
                  <div className="space-y-3">
                    {expenseChart.slice(0, 8).map((item, index) => {
                      const value = Number(item.value ?? item.amount ?? item.total ?? 0);
                      const pct = expenseTotal ? Math.round((value / expenseTotal) * 100) : 0;
                      const color = item.color ?? EXPENSE_COLORS[index % EXPENSE_COLORS.length];
                      return (
                        <div key={item.name ?? item.category ?? index}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 font-medium text-slate-700">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                              {item.name ?? item.category ?? 'Category'}
                            </span>
                            <span className="font-bold tabular-nums text-slate-900">
                              {money(value)} <span className="font-normal text-slate-400">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div className="col-span-12 space-y-4 lg:col-span-4">
            {/* Projects */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Project Health</p>
                    <p className="text-[11px] text-slate-400">{projects.length} active projects</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/project-module/projects')}
                  className="text-xs font-bold text-[#174d36] hover:underline"
                >
                  View All →
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">No projects yet</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {projects.slice(0, 6).map((project, idx) => {
                      const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
                      const colors = [
                        'from-emerald-500 to-teal-500',
                        'from-blue-500 to-indigo-500',
                        'from-violet-500 to-purple-500',
                        'from-amber-500 to-orange-500',
                        'from-rose-500 to-pink-500',
                      ];
                      return (
                        <button
                          key={project._id || idx}
                          onClick={() =>
                            navigate(project._id ? `/project-module/projects/${project._id}` : '/project-module/projects')
                          }
                          className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-slate-50"
                        >
                          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors[idx % colors.length]} text-sm font-bold text-white`}>
                            {progress}%
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {project.name || 'Unnamed Project'}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {project.location || project.subtitle || project.type || '—'}
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-slate-300" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Unsold Inventory */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <PackageCheck className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Unsold Inventory</p>
                    <p className="text-[11px] text-slate-400">{properties.length} units available</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/crm-module/lead')}
                  className="text-xs font-bold text-[#174d36] hover:underline"
                >
                  Match Leads →
                </button>
              </div>

              <div className="max-h-[220px] overflow-y-auto">
                {properties.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No unsold units</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {properties.slice(0, 5).map((property) => (
                      <div
                        key={property._id || property.unit}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {property.unit || 'Unit'}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {[property.project, property.type].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-slate-900">
                            {money(property.price)}
                          </p>
                          {property.status && (
                            <span className={`text-[10px] font-semibold ${property.status === 'In Closing' ? 'text-amber-600' : 'text-[#174d36]'}`}>
                              {property.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 space-y-4 lg:col-span-4">
            {/* Action Required */}
            <div className="overflow-hidden rounded-2xl border-2 border-rose-200 bg-white shadow-md shadow-rose-100">
              <div className="flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Clock3 className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Action Required</p>
                    <p className="text-[11px] text-slate-500">Pending voucher approvals</p>
                  </div>
                </div>
                {vouchers.length > 0 && (
                  <span className="flex size-7 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                    {vouchers.length}
                  </span>
                )}
              </div>

              <div className="max-h-[280px] overflow-y-auto">
                {vouchers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14">
                    <CheckCircle2 className="size-11 text-emerald-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">All clear!</p>
                    <p className="text-xs text-slate-400">No pending vouchers</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {vouchers.map((voucher) => (
                      <div key={voucher._id || voucher.code} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                {voucher.code || 'VCH'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {voucher.dueLabel || 'Pending'}
                              </span>
                            </div>
                            <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">
                              {voucher.description || 'Voucher awaiting approval'}
                            </p>
                            <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                              {money(voucher.amount)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleApproveVoucher(voucher._id)}
                            disabled={!voucher._id || approvingId === voucher._id}
                            className="shrink-0 rounded-xl bg-gradient-to-r from-[#174d36] to-[#2a9d8f] px-3.5 py-1.5 text-xs font-bold text-white shadow-md disabled:opacity-50"
                          >
                            {approvingId === voucher._id ? '…' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-800">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigate('/crm-module/lead')}
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3 text-left transition hover:bg-emerald-50"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-[#174d36]">
                    <Users className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">CRM / Leads</span>
                </button>
                <button
                  onClick={() => navigate('/accounts-module/office-expense')}
                  className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-3 text-left transition hover:bg-amber-50"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Wallet className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Add Expense</span>
                </button>
                <button
                  onClick={() => navigate('/project-module/projects')}
                  className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3 text-left transition hover:bg-blue-50"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Projects</span>
                </button>
                <button
                  onClick={() => navigate('/accounts-module')}
                  className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3 text-left transition hover:bg-violet-50"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <Landmark className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Accounts</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ELEVATED STATS ROW - Customers, Vendors, Payroll, Advances ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-[#174d36]">
                <UserCheck className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Customers</p>
                <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {officeOverview?.customers ?? '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Truck className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Vendors</p>
                <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {officeOverview?.vendors ?? '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Banknote className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Payroll Budget</p>
                <p className="text-xl font-extrabold tabular-nums text-slate-900">
                  {officeOverview?.payroll ? money(officeOverview.payroll.allocatedAmount) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Advances</p>
                <p className="text-xl font-extrabold tabular-nums text-slate-900">
                  {money(officeOverview?.disbursedAdvances)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RECENT ACTIVITY - Completely New Design ===== */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Recent Activity</p>
                <p className="text-[11px] text-slate-400">Latest business events & comments</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50">
                  <FileText className="size-6 text-slate-300" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-500">No recent activity</p>
                <p className="text-xs text-slate-400">Activity will appear here as your team works</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.slice(0, 8).map((comment, idx) => (
                  <div
                    key={comment._id || idx}
                    className="flex gap-3.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition hover:bg-slate-50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#174d36]/10 text-[#174d36]">
                      <span className="text-xs font-bold">
                        {(comment.userName || comment.author || comment.user || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {comment.userName || comment.author || comment.user || 'System'}
                        </p>
                        {comment.type && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {comment.type}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : comment.time || comment.date || ''}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {comment.message || comment.comment || comment.text || comment.content || '—'}
                      </p>
                      {(comment.module || comment.project) && (
                        <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                          {comment.module || comment.project}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}