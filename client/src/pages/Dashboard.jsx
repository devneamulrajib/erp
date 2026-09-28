import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  ChevronRight,
  Users,
  Calendar,
  Landmark,
  ClipboardList,
  ShieldCheck,
  Lock,
  Star,
  MoreHorizontal,
  Wallet,
  Banknote,
  Building2,
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

const DEFAULT_TASKS = [
  { id: 1, label: 'Approve Purchase Order #4821', done: false },
  { id: 2, label: 'Review Skyline Tower budget', done: true },
  { id: 3, label: 'Sign vendor contract — BuildCo', done: false },
];

function Sparkline({ points = [4, 7, 5, 9, 8, 12, 10], className = 'text-emerald-600' }) {
  const w = 58;
  const h = 18;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1 || 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Compact Main Treasury Hero Box (Line 1)
function MainTreasuryCard({ total, accountsCount = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800 p-3.5 flex flex-col justify-between h-full shadow-sm text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="size-3.5" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
            Liquid Treasury
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
          <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
          Live Reserve
        </span>
      </div>

      <div className="my-1">
        <span className="text-2xl font-bold tracking-tight text-white leading-none">
          ৳{Number(total || 0).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1.5 border-t border-white/10">
        <span>{accountsCount} core bank{accountsCount === 1 ? '' : 's'} linked</span>
        <Sparkline points={[4, 6, 8, 7, 10, 9, 13]} className="text-emerald-400" />
      </div>
    </div>
  );
}

// Compact Supporting Metric Box (Line 1)
function MetricBox({ label, value, delta, deltaTone = 'up', icon: Icon, sparkline }) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white p-3.5 flex flex-col justify-between h-full hover:border-neutral-300 hover:shadow-xs transition-all">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 truncate">
          {label}
        </span>
        {Icon && <Icon className="size-3.5 text-neutral-400 shrink-0" />}
      </div>

      <div className="my-1">
        <span className="text-xl font-bold tracking-tight text-neutral-900 leading-none truncate block">
          {value}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-100">
        {delta ? (
          <span
            className={`inline-flex items-center gap-0.5 font-medium truncate ${
              deltaTone === 'up' ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {deltaTone === 'up' ? <ArrowUpRight className="size-3 shrink-0" /> : <ArrowDownRight className="size-3 shrink-0" />}
            {delta}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
        {sparkline && <Sparkline points={sparkline} className="text-emerald-600 shrink-0" />}
      </div>
    </div>
  );
}

// Compact Supporting Mini Box (Line 2)
function MiniOpsBox({ icon: Icon, label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-neutral-500 bg-neutral-100',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5 flex flex-col justify-between h-full hover:border-neutral-300 hover:shadow-xs transition-all">
      <div className="flex items-center gap-1.5">
        <div className={`size-5 rounded flex items-center justify-center ${tones[tone]} shrink-0`}>
          <Icon className="size-3" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 truncate">
          {label}
        </span>
      </div>

      <div className="my-1">
        <span className="text-xl font-bold tracking-tight text-neutral-900 leading-none truncate block">
          {value}
        </span>
      </div>

      <div className="pt-1.5 border-t border-neutral-100 text-[11px] text-neutral-400 truncate">
        Operational Status
      </div>
    </div>
  );
}

const PROJECT_THEMES = [
  { header: 'bg-gradient-to-br from-slate-800 to-slate-950', bar: 'bg-blue-500' },
  { header: 'bg-gradient-to-br from-indigo-950 to-slate-900', bar: 'bg-blue-400' },
  { header: 'bg-gradient-to-br from-emerald-600 to-teal-700', bar: 'bg-emerald-400' },
  { header: 'bg-gradient-to-br from-amber-600 to-orange-700', bar: 'bg-amber-400' },
  { header: 'bg-gradient-to-br from-rose-600 to-pink-700', bar: 'bg-rose-400' },
];

function ProjectListItem({ project, theme, starred }) {
  const p = project;
  const tag = p.tag ?? p.type ?? 'Project';
  const subtitle = p.subtitle ?? p.location ?? '';

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
      <div className={`relative p-4 min-h-[96px] flex flex-col justify-between ${theme.header}`}>
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            {tag}
          </span>
          <Star className={`size-4 ${starred ? 'text-amber-400 fill-amber-400' : 'text-white/50'}`} />
        </div>
        <div>
          <p className="text-white font-semibold text-base leading-5">{p.name}</p>
          {subtitle && <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500">Progress</span>
          <span className="font-semibold text-neutral-900">{p.progress || 0}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
          <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${p.progress || 0}%` }} />
        </div>
        <div className="flex justify-between items-center text-xs text-neutral-500 pt-1">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {p.workers ?? 0} workers on site
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            Due {p.dueDate || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [properties, setProperties] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);
  const [officeOverview, setOfficeOverview] = useState(null);
  const [range, setRange] = useState('12m');
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data));
    api.get('/dashboard/projects').then((r) => setProjects(r.data));
    api.get('/dashboard/bank-balances').then((r) => setBanks(r.data));
    api.get('/dashboard/unsold-properties').then((r) => setProperties(r.data));
    api.get('/dashboard/pending-vouchers').then((r) => setVouchers(r.data));
    api.get('/dashboard/comments').then((r) => setComments(r.data));
    api.get('/dashboard/office-overview').then((r) => setOfficeOverview(r.data)).catch(() => setOfficeOverview(null));
  }, []);

  useEffect(() => {
    const months = RANGE_MONTHS[range] || 12;
    api.get(`/dashboard/expense-chart?months=${months}`).then((r) => setExpenseChart(r.data));
    api.get(`/dashboard/inflow-outflow?months=${months}`).then((r) => setFlow(r.data));
  }, [range]);

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  async function handleApproveVoucher(id) {
    setApprovingId(id);
    try {
      await api.patch(`/dashboard/pending-vouchers/${id}/approve`);
      setVouchers((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve voucher');
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
      [`Expense Breakdown (last ${months} month${months > 1 ? 's' : ''})`],
      ['Month', 'Total'],
      ...expenseChart.map((c) => [c.name ?? c.month, c.value ?? c.total]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!summary) {
    return (
      <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  const requisitionsTotal = (summary.materialReq || 0) + (summary.serviceReq || 0) || summary.requisitions;
  const expenseTotal = expenseChart.reduce((sum, c) => sum + (c.value ?? c.amount ?? 0), 0);
  const expenseColors = ['#0d9488', '#4f46e5', '#f59e0b', '#8b5cf6', '#ec4899'];

  const officeTotals = officeOverview?.officeTotals || { allocatedAmount: 0, spentAmount: 0, remainingAmount: 0 };
  const officeSpentPct = officeTotals.allocatedAmount > 0
    ? Math.min(100, Math.round((officeTotals.spentAmount / officeTotals.allocatedAmount) * 100))
    : 0;

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-left">
      <Topbar />

      <div className="p-6 md:p-8 flex flex-col gap-4">
        {/* Greeting + filter + actions */}
        <div className="flex justify-between items-end flex-wrap gap-4 mb-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="font-semibold text-2xl tracking-tight text-neutral-950">
                Good morning{summary.userName ? `, ${summary.userName}` : ''}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live Sync Active
              </span>
            </div>
            <p className="text-neutral-500 text-xs">
              Real estate capital assets, active project developments, and financial velocity overview
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    range === r.key
                      ? 'bg-neutral-900 text-neutral-50'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="size-3.5" />
              Export Report
            </button>
            <button
              onClick={() => navigate('/requisition-module/material-requisition-add')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 shadow-xs"
            >
              <Plus className="size-3.5" />
              New Requisition
            </button>
          </div>
        </div>

        {/* ========================================================
            LINE 1: TREASURY & FINANCIAL VELOCITY (1 Single Compact Line)
            ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-stretch">
          {/* Main Hero Card: Liquid Treasury */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-4 min-h-[96px]">
            <MainTreasuryCard
              total={banks.total}
              accountsCount={banks.accounts.length}
            />
          </div>

          {/* Supporting: Net Receipts */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MetricBox
              label="Net Receipts"
              value={summary.receipt}
              delta="98% collected"
              icon={Landmark}
              sparkline={[3, 5, 4, 6, 7, 9, 10]}
            />
          </div>

          {/* Supporting: Gross Sales */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MetricBox
              label="Gross Sales"
              value={summary.sales}
              delta="+12% · 18 units"
              icon={ArrowUpRight}
              sparkline={[6, 5, 8, 7, 9, 8, 12]}
            />
          </div>

          {/* Supporting: Total Expenses */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MetricBox
              label="Total Expenses"
              value={summary.expenses}
              delta="4.2% under"
              deltaTone="down"
              icon={ArrowDownRight}
            />
          </div>

          {/* Supporting: Requisitions */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MetricBox
              label="Requisitions"
              value={requisitionsTotal ?? '—'}
              delta="pending signoff"
              deltaTone="down"
              icon={ClipboardList}
            />
          </div>
        </div>

        {/* ========================================================
            LINE 2: BUDGET & OPERATIONS (1 Single Compact Line)
            ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-stretch">
          {/* Main Card: Office Budget Overview */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-4 rounded-xl border border-neutral-200 bg-white p-3.5 flex flex-col justify-between h-full min-h-[96px] shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="size-3.5 text-neutral-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Office Budget Overview
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-bold tracking-tight text-neutral-900 leading-none">
                  ৳{Number(officeTotals.spentAmount).toLocaleString()}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">
                  of ৳{Number(officeTotals.allocatedAmount).toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${officeSpentPct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${officeSpentPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 text-[11px]">
              <span className="text-neutral-400">{officeSpentPct}% spent</span>
              <span className={`font-semibold ${officeTotals.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                Rem: ৳{Number(officeTotals.remainingAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Supporting: Monthly Payroll Budget */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MiniOpsBox
              icon={Banknote}
              label="Payroll Budget"
              tone="indigo"
              value={
                officeOverview?.payroll
                  ? `৳${Number(officeOverview.payroll.allocatedAmount).toLocaleString()}`
                  : '—'
              }
            />
          </div>

          {/* Supporting: Disbursed Advances / Loans */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MiniOpsBox
              icon={Wallet}
              label="Disbursed Loans"
              tone="amber"
              value={`৳${Number(officeOverview?.disbursedAdvances || 0).toLocaleString()}`}
            />
          </div>

          {/* Supporting: Vendors / Suppliers */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MiniOpsBox
              icon={Truck}
              label="Vendors"
              tone="neutral"
              value={officeOverview?.vendors ?? '—'}
            />
          </div>

          {/* Supporting: Customers */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-h-[96px]">
            <MiniOpsBox
              icon={Building2}
              label="Customers"
              tone="emerald"
              value={officeOverview?.customers ?? '—'}
            />
          </div>
        </div>

        {/* ========================================================
            DASHBOARD CONTENT: Projects / Charts / Vouchers
            ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
          {/* Active Projects */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Active Projects</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  {projects.length} active
                </span>
              </div>
              <button
                onClick={() => navigate('/project-module/projects')}
                className="text-neutral-500 text-xs font-medium flex items-center gap-1 hover:text-neutral-900 whitespace-nowrap"
              >
                View all
                <ChevronRight className="size-3" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {projects.length === 0 ? (
                <p className="text-neutral-400 text-xs text-center py-8">No projects yet</p>
              ) : (
                projects.map((p, i) => (
                  <ProjectListItem
                    key={p._id}
                    project={p}
                    theme={PROJECT_THEMES[i % PROJECT_THEMES.length]}
                    starred={i === 0}
                  />
                ))
              )}
            </div>

            <button
              onClick={() => navigate('/project-module/site')}
              className="mt-1 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Explore All Active Construction Sites
            </button>
          </div>

          {/* Expense breakdown + Inflow/Outflow */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm leading-5 font-semibold">Expense Breakdown</h3>
                  <p className="text-neutral-500 text-xs leading-4">
                    Last {RANGE_MONTHS[range] === 1 ? '30 days' : `${RANGE_MONTHS[range]} months`} distribution
                  </p>
                </div>
                <button className="text-neutral-400 hover:text-neutral-600" aria-label="More options">
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <ExpenseDonut data={expenseChart} />
                </div>
                <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                  {expenseChart.length === 0 ? (
                    <p className="text-neutral-400 text-xs">No expense data yet</p>
                  ) : (
                    expenseChart.map((c, i) => {
                      const value = c.value ?? c.amount ?? 0;
                      const pct = expenseTotal ? Math.round((value / expenseTotal) * 100) : 0;
                      return (
                        <div key={c.name ?? c.category ?? i} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color ?? expenseColors[i % expenseColors.length] }}
                            />
                            <span className="truncate text-neutral-600">{c.name ?? c.category ?? 'Category'}</span>
                          </span>
                          <span className="whitespace-nowrap text-neutral-900 font-medium">{pct}%</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm leading-5 font-semibold">Inflow vs Outflow</h3>
                  <p className="text-neutral-500 text-xs leading-4">Cash movement overview across quarters</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" />
                    In Flow
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-500" />
                    Out Flow
                  </span>
                </div>
              </div>
              <div className="flex justify-center">
                <InflowOutflowChart labels={flow.labels} inflow={flow.inflow} outflow={flow.outflow} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100 text-xs">
                <span className="text-neutral-500">
                  Net Cash Position: <span className="text-neutral-900 font-medium">+৳245,000 reserve</span>
                </span>
                <span className="text-emerald-600 font-medium">+18.4% liquidity ratio</span>
              </div>
            </div>
          </div>

          {/* Pending Vouchers + Quick Tasks */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pending Vouchers</h3>
                {vouchers.length > 0 && (
                  <span className="flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                    {vouchers.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {vouchers.length === 0 && (
                  <p className="text-neutral-400 text-xs text-center py-4">No pending vouchers</p>
                )}
                {vouchers.map((v) => (
                  <div
                    key={v._id || v.code}
                    className="rounded-xl border border-neutral-100 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 mb-1">
                        {v.code}
                      </span>
                      <p className="text-sm font-medium text-neutral-900 truncate">{v.description}</p>
                      <p className="text-neutral-400 text-xs">{v.dueLabel || 'Pending review'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-neutral-900">৳{Number(v.amount).toLocaleString()}</p>
                      <button
                        onClick={() => handleApproveVoucher(v._id)}
                        disabled={approvingId === v._id}
                        className="text-emerald-600 text-xs font-medium hover:text-emerald-700 disabled:opacity-50"
                      >
                        {approvingId === v._id ? 'Approving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Review all vouchers
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quick Tasks</h3>
                <span className="text-neutral-400 text-xs whitespace-nowrap">
                  {tasks.filter((t) => !t.done).length} items to review
                </span>
              </div>
              <p className="text-neutral-500 text-xs -mt-1">Construction milestones &amp; authorisations</p>
              <div className="flex flex-col gap-3 mt-1">
                {tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="size-4 rounded border-neutral-300 accent-emerald-600"
                    />
                    <span className={`text-sm ${t.done ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & CRM */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm leading-5 font-semibold">Available Inventory &amp; CRM</h3>
              <p className="text-neutral-500 text-xs leading-4">High-tier units ready for contract execution</p>
            </div>
            <button
              onClick={() => navigate('/crm-module/lead')}
              className="text-emerald-600 text-xs font-medium flex items-center gap-1 hover:text-emerald-700 whitespace-nowrap"
            >
              Match CRM Leads
              <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {properties.length === 0 && (
              <p className="text-neutral-400 text-xs text-center py-4">No unsold properties</p>
            )}
            {properties.map((p) => (
              <div key={p._id || p.unit} className="flex items-center gap-3">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium text-sm leading-5 flex items-center gap-2">
                    {p.unit}
                    {p.status && (
                      <span
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                          p.status === 'In Closing'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    )}
                  </span>
                  <span className="text-neutral-500 text-xs leading-4 truncate">
                    {p.project} · {p.type}
                  </span>
                </div>
                <span className="font-semibold text-sm leading-5 whitespace-nowrap">
                  ৳{Number(p.price).toLocaleString()}
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate('/crm-module/lead')}
              className="mt-1 inline-flex items-center justify-center gap-2 text-sm font-medium w-full bg-neutral-900 text-white rounded-xl py-2.5 hover:bg-neutral-800"
            >
              <Users className="size-4" />
              Open Automated CRM Lead Matcher
            </button>
          </div>
        </div>

        {/* Treasury & liquidity accounts */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm leading-5 font-semibold">Treasury &amp; Liquidity Accounts</h3>
              <p className="text-neutral-500 text-xs leading-4">Core banking balances across operational and escrow facilities</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-neutral-500 text-xs leading-4">Total Liquid Reserve</span>
              <span className="font-bold text-lg leading-7">৳{Number(banks.total || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {banks.accounts.length === 0 && (
              <p className="text-neutral-400 text-xs text-center py-4 col-span-full">No accounts found</p>
            )}
            {banks.accounts.map((acc) => (
              <div key={acc._id || acc.number} className="rounded-xl border border-neutral-200 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{acc.bank}</span>
                  <Lock className="size-3.5 text-neutral-300" />
                </div>
                <span className="text-neutral-400 text-xs">
                  {acc.type} · ****{acc.number}
                </span>
                <span className="font-semibold text-lg">৳{Number(acc.balance).toLocaleString()}</span>
                {acc.statusLabel && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {acc.statusLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <CommentsTable comments={comments} />
      </div>
    </div>
  );
}