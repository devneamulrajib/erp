// client/src/pages/Dashboard.jsx
// Executive command center (/dashboard) for admins / superadmins.
// Light theme only, in the workspace colours (forest green, lime, cream,
// white cards; tokens in index.css @theme). Layout: slim header row (date on
// the left, Refresh / Export / New requisition on the right), five KPI cards, an
// operations strip of four counters, then cards with one shared header style:
// cash flow, approvals, treasury, projects, inventory, expense mix, recent
// activity and a business snapshot.
// Every figure comes from the existing /dashboard/* endpoints; nothing is
// estimated. Admin navigation stays in the top floating menu (no sidebar).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RealEstateBackdrop from '../components/RealEstateBackdrop';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Landmark,
  Layers,
  PackageCheck,
  Plus,
  RefreshCw,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import { Skeleton } from '../components/dashboard/DashboardKit';
import { currentStaffUser } from '../components/dashboard/dashboardUtils';
import { canOpenLink } from '../config/permissions';

const RANGES = [
  { key: '30d', label: '30 days' },
  { key: '6m', label: '6 months' },
  { key: '12m', label: '12 months' },
];
const RANGE_MONTHS = { '30d': 1, '6m': 6, '12m': 12 };

// Forest / lime family plus two warm accents for the expense mix.
const EXPENSE_COLORS = ['#0f3d33', '#84cc16', '#2f7a63', '#d9f99d', '#f59e0b', '#a8a29e'];

const money = (value) =>
  `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString('en-BD');

// Short, readable Taka: 1.80 Cr / 4.25 Lakh / 12.5K.
function compact(value) {
  const n = Number(value) || 0;
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}৳${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}৳${(a / 1e5).toFixed(2)} Lakh`;
  if (a >= 1e3) return `${s}৳${(a / 1e3).toFixed(1)}K`;
  return `${s}৳${Math.round(a)}`;
}

// One card style for the whole page.
const cardBase = 'rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
const btnOutline =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 disabled:opacity-60';
const btnPrimary =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-forest px-3.5 text-sm font-medium text-white transition-colors hover:bg-forest-900';

export default function Dashboard() {
  const navigate = useNavigate();
  // Buttons and shortcuts only for pages this user may open.
  const canGo = (path) => canOpenLink(currentStaffUser(), path);
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
  const [projectSummary, setProjectSummary] = useState(null);
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
      api.get('/dashboard/project-summary').then((r) => setProjectSummary(r.data)).catch(() => setProjectSummary(null)),
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
  const runningProjects = projectSummary?.runningProject ?? projects.length;


  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const sumOf = (list) => (Array.isArray(list) ? list : []).reduce((s, v) => s + (Number(v) || 0), 0);
  const inflowTotal = sumOf(flow.inflow);
  const outflowTotal = sumOf(flow.outflow);

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

  const frame = (content) => (
    <div className="relative min-h-screen w-full bg-cream text-left text-slate-800">
      {/* Decorative real-estate line art; delete this line to turn it off */}
      <RealEstateBackdrop />
      <Topbar />
      <div className="relative z-[1]">{content}</div>
    </div>
  );

  if (!summary) {
    return frame(
      summaryError ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Dashboard couldn&rsquo;t load</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">{summaryError}</p>
          <button onClick={() => loadDashboard(true)} className={`${btnPrimary} mt-5`}>
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      ) : (
        <DashboardSkeleton />
      )
    );
  }

  const ledger = [
    { label: 'Running projects', value: runningProjects, hint: 'Projects in progress', icon: Building2, to: '/project-module/projects' },
    { label: 'Unsold units', value: properties.length, hint: 'Units available', icon: PackageCheck, to: '/inventory-module/flat' },
    { label: 'Requisitions', value: requisitionsTotal, hint: 'Material and service', icon: ClipboardList, to: '/requisition-module/material-requisition-list' },
    { label: 'Pending approvals', value: vouchers.length, hint: 'Awaiting review', icon: Clock3, to: '/accounts-module/approval-center' },
  ];

  const snapshot = [
    { label: 'Customers', value: officeOverview?.customers != null ? number(officeOverview.customers) : '\u2014', icon: UserCheck },
    { label: 'Vendors', value: officeOverview?.vendors != null ? number(officeOverview.vendors) : '\u2014', icon: Truck },
    { label: 'Payroll budget', value: officeOverview?.payroll ? money(officeOverview.payroll.allocatedAmount) : '\u2014', icon: Banknote },
    { label: 'Advances', value: officeOverview ? money(officeOverview.disbursedAdvances) : '\u2014', icon: Wallet },
  ];

  const netMovement = inflowTotal - outflowTotal;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label;

  return frame(
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      {/* ===== PAGE HEADER ===== */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{todayLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
            className={`${btnOutline} w-9 px-0`}
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportReport} className={btnOutline}>
            <Download className="size-4" /> Export
          </button>
          {canGo('/requisition-module/material-requisition-add') && (
            <button onClick={() => navigate('/requisition-module/material-requisition-add')} className={btnPrimary}>
              <Plus className="size-4" /> New requisition
            </button>
          )}
        </div>
      </header>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Net position"
          value={money(netPosition)}
          sub="Receipts minus expenses, all time"
          icon={Landmark}
          tile="bg-forest text-lime-200"
          negative={netPosition < 0}
        />
        <Kpi label="Receipts" value={money(summary.receipt)} sub="All-time collected" icon={ArrowUpRight} tile="bg-lime-100 text-forest" />
        <Kpi label="Expenses" value={money(summary.expenses)} sub="All-time recorded" icon={ArrowDownRight} tile="bg-orange-50 text-orange-600" />
        <Kpi
          label="Treasury"
          value={money(banks.total)}
          sub={`${number(banks.accounts.length)} linked account${banks.accounts.length === 1 ? '' : 's'}`}
          icon={Wallet}
          tile="bg-stone-100 text-slate-600"
        />
        <Kpi
          label="Office budget used"
          value={`${officeSpentPct}%`}
          sub={`${money(officeTotals.spentAmount)} of ${money(officeTotals.allocatedAmount)}`}
          icon={Layers}
          tile="bg-stone-100 text-slate-600"
        >
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${officeSpentPct >= 90 ? 'bg-rose-500' : 'bg-forest'}`} style={{ width: `${officeSpentPct}%` }} />
          </div>
        </Kpi>
      </div>

      {/* ===== OPERATIONS STRIP ===== */}
      <section className={`${cardBase} grid grid-cols-2 overflow-hidden lg:grid-cols-4`}>
        {ledger.map((s, i) => {
          const ok = canGo(s.to);
          return (
            <button
              key={s.label}
              onClick={() => ok && navigate(s.to)}
              disabled={!ok}
              className={`group flex items-center gap-4 p-5 text-left transition-colors hover:bg-stone-50 disabled:cursor-default ${
                i % 2 === 1 ? 'border-l border-stone-200/80' : ''
              } ${i >= 2 ? 'border-t border-stone-200/80 lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-slate-600">
                <s.icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-slate-500">{s.label}</span>
                <span className="mt-0.5 block text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{number(s.value)}</span>
                <span className="block truncate text-xs text-slate-400">{s.hint}</span>
              </span>
              {ok && <ChevronRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-forest" />}
            </button>
          );
        })}
      </section>

      {/* ===== CASH FLOW | APPROVALS + TREASURY ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          className="lg:col-span-8"
          title="Cash flow"
          subtitle={`Inflow vs outflow \u00b7 ${rangeLabel}`}
          action={
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5">
              {RANGES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    range === item.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-3 divide-x divide-stone-200/80 rounded-xl border border-stone-200/80">
            <FlowStat label="Inflow" value={money(inflowTotal)} swatch="bg-lime-400" />
            <FlowStat label="Outflow" value={money(outflowTotal)} swatch="bg-forest" />
            <FlowStat label="Net movement" value={money(netMovement)} negative={netMovement < 0} />
          </div>
          <div className="mt-6">
            <CashFlowChart labels={flow.labels || []} inflow={flow.inflow || []} outflow={flow.outflow || []} />
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card
            title="Pending approvals"
            subtitle="Voucher approvals awaiting review"
            action={
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${vouchers.length ? 'bg-lime-200 text-forest' : 'bg-stone-100 text-slate-500'}`}>
                {vouchers.length}
              </span>
            }
            bodyClassName="max-h-[300px] overflow-y-auto px-6 pb-6"
          >
            {vouchers.length === 0 ? (
              <EmptyBlock icon={CheckCircle2} title="All clear" text="No pending vouchers right now" />
            ) : (
              <div className="divide-y divide-stone-100">
                {vouchers.map((voucher) => (
                  <div key={voucher._id || voucher.code} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-medium text-slate-600">{voucher.code || 'VCH'}</span>
                        <span className="text-slate-400">{voucher.dueLabel || 'Pending'}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-700">{voucher.description || 'Voucher awaiting approval'}</p>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{money(voucher.amount)}</p>
                    </div>
                    <button
                      onClick={() => handleApproveVoucher(voucher._id)}
                      disabled={!voucher._id || approvingId === voucher._id}
                      className={`${btnPrimary} h-8 shrink-0 px-3 text-xs disabled:opacity-50`}
                    >
                      {approvingId === voucher._id ? 'Approving\u2026' : 'Approve'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            className="flex-1"
            title="Liquid treasury"
            subtitle={`${money(banks.total)} available`}
            action={canGo('/accounts-module/bank-accounts') && <TextLink onClick={() => navigate('/accounts-module/bank-accounts')}>Manage</TextLink>}
          >
            {banks.accounts.length === 0 ? (
              <EmptyBlock icon={Landmark} title="No bank accounts linked" text="Link an account to see your balances" />
            ) : (
              <div className="space-y-3">
                {banks.accounts.slice(0, 4).map((acc, i) => {
                  const share = Number(banks.total) > 0 ? Math.max(0, Math.min(100, (Number(acc.balance) / Number(banks.total)) * 100)) : 0;
                  return (
                    <div key={acc._id || i}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">{acc.bank || 'Bank Account'}</span>
                          <span className="block text-xs text-slate-400">
                            {acc.type || 'Account'}
                            {acc.number ? ` \u00b7\u00b7\u00b7${String(acc.number).slice(-4)}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{money(acc.balance)}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-lime-400" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ===== PROJECTS | INVENTORY | EXPENSE MIX ===== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Project health"
          subtitle={`${number(projects.length)} active projects`}
          action={canGo('/project-module/projects') && <TextLink onClick={() => navigate('/project-module/projects')}>View all</TextLink>}
          bodyClassName="max-h-[320px] overflow-y-auto px-3 pb-4"
        >
          {projects.length === 0 ? (
            <div className="px-3 pb-2"><EmptyBlock icon={Building2} title="No projects yet" text="Projects will show here with their progress" /></div>
          ) : (
            projects.slice(0, 6).map((project, idx) => {
              const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
              return (
                <button
                  key={project._id || idx}
                  onClick={() =>
                    canGo('/project-module/projects') &&
                    navigate(project._id ? `/project-module/projects/${project._id}` : '/project-module/projects')
                  }
                  disabled={!canGo('/project-module/projects')}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                >
                  <ProgressRing value={progress} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{project.name || 'Unnamed Project'}</span>
                    <span className="block truncate text-xs text-slate-400">{project.location || project.subtitle || project.type || '\u2014'}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-forest" />
                </button>
              );
            })
          )}
        </Card>

        <Card
          title="Unsold inventory"
          subtitle={`${number(properties.length)} units available`}
          action={canGo('/crm-module/lead') && <TextLink onClick={() => navigate('/crm-module/lead')}>Match leads</TextLink>}
          bodyClassName="max-h-[320px] overflow-y-auto px-6 pb-6"
        >
          {properties.length === 0 ? (
            <EmptyBlock icon={PackageCheck} title="No unsold units" text="Available flats and land will show here" />
          ) : (
            <div className="divide-y divide-stone-100">
              {properties.slice(0, 5).map((property, idx) => (
                <div key={property._id || property.unit || idx} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{property.unit || 'Unit'}</p>
                    <p className="truncate text-xs text-slate-400">{[property.project, property.type].filter(Boolean).join(' \u00b7 ')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{money(property.price)}</p>
                    {property.status && (
                      <p className={`text-xs ${property.status === 'In Closing' ? 'text-amber-600' : 'text-forest'}`}>{property.status}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Expense mix" subtitle={`${rangeLabel} \u00b7 total ${money(expenseTotal)}`} className="md:col-span-2 lg:col-span-1">
          {expenseChart.length === 0 || !expenseTotal ? (
            <EmptyBlock icon={Layers} title="No expense data" text="Nothing recorded for this period" />
          ) : (
            <>
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                {expenseChart.slice(0, 6).map((item, index) => {
                  const value = Number(item.value ?? item.amount ?? item.total ?? 0);
                  const pct = (value / expenseTotal) * 100;
                  return pct > 0 ? (
                    <span
                      key={item.name ?? item.category ?? index}
                      title={`${item.name ?? item.category ?? 'Category'}: ${money(value)}`}
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: item.color ?? EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                    />
                  ) : null;
                })}
              </div>
              <div className="mt-4 space-y-2.5">
                {expenseChart.slice(0, 6).map((item, index) => {
                  const value = Number(item.value ?? item.amount ?? item.total ?? 0);
                  const pct = Math.round((value / expenseTotal) * 100);
                  return (
                    <div key={item.name ?? item.category ?? index} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-slate-600">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color ?? EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} />
                        <span className="truncate">{item.name ?? item.category ?? 'Category'}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-medium text-slate-900">{money(value)}</span>
                        <span className="ml-2 inline-block w-9 text-right text-xs text-slate-400">{pct}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ===== RECENT ACTIVITY | SNAPSHOT ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          className="lg:col-span-8"
          title="Recent activity"
          subtitle="Latest business events and comments"
          bodyClassName="max-h-[360px] overflow-y-auto px-6 pb-6"
        >
          {comments.length === 0 ? (
            <EmptyBlock icon={FileText} title="No recent activity" text="Activity will appear here as your team works" />
          ) : (
            <div className="divide-y divide-stone-100">
              {comments.slice(0, 8).map((comment, idx) => (
                <div key={comment._id || idx} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lime-100 text-xs font-semibold text-forest">
                    {(comment.userName || comment.author || comment.user || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="text-sm font-medium text-slate-800">{comment.userName || comment.author || comment.user || 'System'}</p>
                      {comment.type && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-slate-600">{comment.type}</span>}
                      <span className="text-xs text-slate-400">
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : comment.time || comment.date || ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {comment.message || comment.comment || comment.text || comment.content || '\u2014'}
                    </p>
                    {(comment.module || comment.project) && <p className="mt-0.5 text-xs text-slate-400">{comment.module || comment.project}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-4" title="Business snapshot" subtitle="Customers, vendors, payroll and advances" bodyClassName="px-6 pb-4">
          <div className="divide-y divide-stone-100">
            {snapshot.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-stone-100 text-slate-500">
                    <s.icon className="size-4" />
                  </span>
                  {s.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, subtitle, action, children, className = '', bodyClassName = 'px-6 pb-6' }) {
  return (
    <section className={`${cardBase} flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action || null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, icon: Icon, tile, negative = false, children }) {
  return (
    <div className={`${cardBase} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tile}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={`mt-3 truncate text-2xl font-semibold tabular-nums tracking-tight ${negative ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
      {children}
    </div>
  );
}

function TextLink({ onClick, children }) {
  return (
    <button onClick={onClick} className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-forest transition-colors hover:text-forest-900">
      {children} <ChevronRight className="size-3.5" />
    </button>
  );
}

function FlowStat({ label, value, swatch, negative = false }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        {swatch && <span className={`size-2 rounded-sm ${swatch}`} />}
        {label}
      </p>
      <p className={`mt-0.5 truncate text-base font-semibold tabular-nums ${negative ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

// Round numbers for the y axis (1, 2, 2.5, 5 x 10^n).
function niceMax(max) {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const f = max / p;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * p;
}

// Paired lime / forest columns with a hover read-out (no chart library).
function CashFlowChart({ labels, inflow, outflow }) {
  const [hover, setHover] = useState(null);
  const n = labels.length;
  const values = [...inflow, ...outflow].map((v) => Number(v) || 0);
  const top = niceMax(Math.max(0, ...values));
  const hasData = n > 0 && values.some((v) => v > 0);
  if (!hasData) {
    return <EmptyBlock icon={Layers} title="No cash movement" text="Receipts and payments for this period will chart here" />;
  }
  const step = Math.max(1, Math.ceil(n / 12));
  const h = (v) => {
    const x = Number(v) || 0;
    return x > 0 ? Math.max(1.5, (x / top) * 100) : 0;
  };
  return (
    <div>
      <div className="relative h-56 pl-14">
        {[1, 0.5, 0].map((t) => (
          <div key={t} className="absolute left-14 right-0 border-t border-stone-100" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -left-14 -translate-y-1/2 text-[11px] tabular-nums text-slate-400">{compact(top * t)}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-1 sm:gap-2">
          {labels.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className="relative flex h-full min-w-0 flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className={`absolute inset-0 rounded-md transition-colors ${hover === i ? 'bg-stone-100/70' : ''}`} />
              <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                <span className="w-full max-w-[14px] rounded-t bg-lime-400" style={{ height: `${h(inflow[i])}%` }} />
                <span className="w-full max-w-[14px] rounded-t bg-forest" style={{ height: `${h(outflow[i])}%` }} />
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <p className="font-medium text-slate-900">{label}</p>
                  <p className="mt-1 flex items-center gap-1.5 tabular-nums text-slate-600"><span className="size-2 rounded-sm bg-lime-400" /> In {money(inflow[i])}</p>
                  <p className="flex items-center gap-1.5 tabular-nums text-slate-600"><span className="size-2 rounded-sm bg-forest" /> Out {money(outflow[i])}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1 pl-14 sm:gap-2">
        {labels.map((label, i) => (
          <span key={`${label}-x-${i}`} className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-400">
            {i % step === 0 ? label : ''}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-lime-400" /> Inflow</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-forest" /> Outflow</span>
      </div>
    </div>
  );
}

function ProgressRing({ value }) {
  const c = 2 * Math.PI * 16;
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#f5f5f4" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="#0f3d33"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="relative text-[10px] font-semibold tabular-nums text-slate-700">{value}%</span>
    </span>
  );
}

function EmptyBlock({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-slate-400">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {text && <p className="mt-0.5 max-w-[240px] text-xs text-slate-400">{text}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-16 w-72 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-12 gap-6">
        <Skeleton className="col-span-12 h-96 rounded-2xl lg:col-span-8" />
        <Skeleton className="col-span-12 h-96 rounded-2xl lg:col-span-4" />
      </div>
    </main>
  );
}