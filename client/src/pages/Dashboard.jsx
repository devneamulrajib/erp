import { useEffect, useState } from 'react';
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

const DEFAULT_TASKS = [
  { id: 1, label: 'Approve Purchase Order #4821', done: false },
  { id: 2, label: 'Review Skyline Tower budget', done: true },
  { id: 3, label: 'Sign vendor contract — BuildCo', done: false },
];

// Small inline trend sparkline so stat cards don't need a charting lib
// for a decorative squiggle. Pass an array of numbers (or omit for a flat line).
function Sparkline({ points = [4, 7, 5, 9, 8, 12, 10], className = 'text-emerald-600' }) {
  const w = 72;
  const h = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1 || 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={`transition-colors duration-150 ${className}`}>
      <path d={d} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, delta, deltaTone = 'up', icon: Icon, sparkline }) {
  return (
    <div className="group rounded-2xl p-4 flex flex-col gap-3 border cursor-pointer transition-colors duration-150 bg-white border-neutral-200 hover:bg-neutral-900 hover:border-neutral-900 hover:text-neutral-50">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium uppercase tracking-wide transition-colors duration-150 text-neutral-400 group-hover:text-neutral-300">
          {label}
        </span>
        {Icon && (
          <Icon className="size-4 transition-colors duration-150 text-neutral-400 group-hover:text-neutral-300" />
        )}
      </div>
      <span className="font-bold text-2xl leading-7">{value}</span>
      <div className="flex items-center justify-between">
        {delta ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150 ${
              deltaTone === 'up'
                ? 'text-emerald-600 group-hover:text-emerald-300'
                : 'text-amber-600 group-hover:text-amber-300'
            }`}
          >
            {deltaTone === 'up' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta}
          </span>
        ) : (
          <span />
        )}
        {sparkline && <Sparkline points={sparkline} className="text-emerald-600 group-hover:text-emerald-300" />}

      </div>
    </div>
  );
}

// Colored header + progress-bar accent cycled across project cards, since
// the reference design uses a solid color panel per card rather than a photo.
const PROJECT_THEMES = [
  { header: 'bg-gradient-to-br from-slate-800 to-slate-950', bar: 'bg-blue-500' },
  { header: 'bg-gradient-to-br from-indigo-950 to-slate-900', bar: 'bg-blue-400' },
  { header: 'bg-gradient-to-br from-emerald-600 to-teal-700', bar: 'bg-emerald-400' },
  { header: 'bg-gradient-to-br from-amber-600 to-orange-700', bar: 'bg-amber-400' },
  { header: 'bg-gradient-to-br from-rose-600 to-pink-700', bar: 'bg-rose-400' },
];

function ProjectListItem({ project, theme, starred }) {
  const p = project;
  // TODO: a category tag (e.g. "COMMERCIAL") and a short subtitle line
  // (e.g. "Tower Alpha • Floor 12-16") aren't on the current
  // /dashboard/projects response — falling back to type/location.
  const tag = p.tag ?? p.type ?? 'Project';
  const subtitle = p.subtitle ?? p.location ?? '';

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
      <div className={`relative p-4 min-h-[96px] flex flex-col justify-between ${theme.header}`}>
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            {tag}
          </span>
          {/* TODO: "favorited" isn't a real field yet — this is purely decorative for now */}
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
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [properties, setProperties] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);
  const [range, setRange] = useState('12m');
  const [tasks, setTasks] = useState(DEFAULT_TASKS);

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data));
    api.get('/dashboard/projects').then((r) => setProjects(r.data));
    api.get('/dashboard/expense-chart').then((r) => setExpenseChart(r.data));
    api.get('/dashboard/inflow-outflow').then((r) => setFlow(r.data));
    api.get('/dashboard/bank-balances').then((r) => setBanks(r.data));
    api.get('/dashboard/unsold-properties').then((r) => setProperties(r.data));
    api.get('/dashboard/pending-vouchers').then((r) => setVouchers(r.data));
    api.get('/dashboard/comments').then((r) => setComments(r.data));
  }, []);

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  if (!summary) {
    return (
      <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  // TODO: none of these percentage deltas exist on the current summary
  // response yet — add them server-side (e.g. summary.expensesDeltaPct)
  // to replace the '—' fallbacks below.
  const requisitionsTotal = (summary.materialReq || 0) + (summary.serviceReq || 0) || summary.requisitions;
  const expenseTotal = expenseChart.reduce((sum, c) => sum + (c.value ?? c.amount ?? 0), 0);
  const expenseColors = ['#0d9488', '#4f46e5', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-left">
      <Topbar />

      <div className="p-8 flex flex-col gap-6">
        {/* Greeting + range filter + actions */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-2xl leading-8 tracking-tight text-neutral-950">
                Good morning{summary.userName ? `, ${summary.userName}` : ''}
              </h1>
              {/* TODO: wire to a real "last synced" / live-connection signal if you have one */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live Sync Active
              </span>
            </div>
            <p className="text-neutral-500 text-sm leading-5">
              Real estate capital assets, active project developments, and financial velocity overview
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 text-xs leading-4 rounded-md transition-colors ${
                    range === r.key
                      ? 'bg-neutral-900 text-neutral-50'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              <Download className="size-3.5" />
              Export Report
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20">
              <Plus className="size-3.5" />
              New Requisition
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Net Receipts"
            value={summary.receipt}
            delta="98% collected" // TODO: replace with real collection-rate field
            icon={Landmark}
            sparkline={[3, 5, 4, 6, 7, 9, 10]}
          />
          <StatCard
            label="Gross Sales"
            value={summary.sales}
            delta="+12% · 18 units" // TODO: replace with real delta + unit count fields
            icon={ArrowUpRight}
            sparkline={[6, 5, 8, 7, 9, 8, 12]}
          />
          <StatCard
            label="Total Expenses"
            value={summary.expenses}
            delta="4.2% under budget" // TODO: replace with a real variance field
            deltaTone="down"
            icon={ArrowDownRight}
          />
          <StatCard
            label="Requisitions"
            value={requisitionsTotal ?? '—'}
            delta="pending signoff" // TODO: needs a pending/fulfilled breakdown field
            deltaTone="down"
            icon={ClipboardList}
          />
          <StatCard
            label="Liquid Treasury"
            value={`$${Number(banks.total || 0).toLocaleString()}`}
            delta={`${banks.accounts.length} core banks`}
            icon={ShieldCheck}
          />
        </div>

        {/* Active Projects / Financial overview / Vouchers & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Active Projects */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Active Projects</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  {projects.length} active
                </span>
              </div>
              <button className="text-neutral-500 text-xs font-medium flex items-center gap-1 hover:text-neutral-900 whitespace-nowrap">
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

            {/* TODO: total site count (e.g. "12") isn't on the projects response yet */}
            <button className="mt-1 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Explore All Active Construction Sites
            </button>
          </div>

          {/* Expense breakdown + Inflow/Outflow */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm leading-5 font-semibold">Expense Breakdown</h3>
                  <p className="text-neutral-500 text-xs leading-4">Last 12 months distribution</p>
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
                {/* TODO: these two figures aren't on the /dashboard/inflow-outflow response yet */}
                <span className="text-neutral-500">
                  Net Cash Position: <span className="text-neutral-900 font-medium">+$245,000 reserve</span>
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
                      {/* TODO: a "due in X days" / "due today" label isn't on this response yet */}
                      <p className="text-neutral-400 text-xs">{v.dueLabel || 'Pending review'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-neutral-900">${Number(v.amount).toLocaleString()}</p>
                      <button className="text-emerald-600 text-xs font-medium hover:text-emerald-700">Approve</button>
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
            <button className="text-emerald-600 text-xs font-medium flex items-center gap-1 hover:text-emerald-700 whitespace-nowrap">
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
                    {/* TODO: status tag (Unreserved / In Closing) isn't on this response yet */}
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
                  ${Number(p.price).toLocaleString()}
                </span>
              </div>
            ))}
            <button className="mt-1 inline-flex items-center justify-center gap-2 text-sm font-medium w-full bg-neutral-900 text-white rounded-xl py-2.5 hover:bg-neutral-800">
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
              <span className="font-bold text-lg leading-7">${Number(banks.total || 0).toLocaleString()}</span>
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
                <span className="font-semibold text-lg">${Number(acc.balance).toLocaleString()}</span>
                {/* TODO: live-status label ("Live Wire Active", "Restricted Escrow") isn't on this response yet */}
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