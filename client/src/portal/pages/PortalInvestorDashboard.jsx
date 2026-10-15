import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInvestorSummary,
  getInvestorAllocation,
  getInvestorHistory,
  getInvestorCompare,
} from '../api/portalInvestor';
import ProjectDonutChart from '../investor/components/ProjectDonutChart';
import StatusChip from '../investor/components/StatusChip';
import AmountText from '../investor/components/AmountText';
import ReturnTypeBadge from '../investor/components/ReturnTypeBadge';
import { PortfolioCardSkeleton, CardSkeleton } from '../investor/components/SkeletonLoader';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const STATUS_FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['matured', 'Matured'],
  ['returned', 'Returned'],
];

const matchesStatus = (status, filter) => {
  const s = String(status || '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'returned') return s === 'fully_returned' || s === 'partially_returned';
  return s === filter;
};

const ICONS = {
  refresh: 'M4 4v5h.6M20 20v-5h-.6M5.6 9A8 8 0 0 1 19.4 7M18.4 15A8 8 0 0 1 4.6 17',
  print: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  inbox: 'M3 13l3-8h12l3 8M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M3 13h5l1 3h6l1-3h5',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  compare: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  wallet:
    'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14h2',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  down: 'M12 5v14M6 13l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
};

function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function Card({ title, subtitle, action, children, className = '', bodyClass = 'p-5 sm:p-6' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-wealth-display text-[15px] font-semibold text-[#0B1530]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

function EmptyBlock({ title, text }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="inbox" className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{text}</p>
    </div>
  );
}

function HeroStat({ label, hint, chip, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">{label}</span>
        {chip}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function QuickAction({ to, icon, title, text, tone }) {
  return (
    <Link
      to={to}
      className="no-print group flex items-center gap-3 rounded-2xl border border-[#E3E8F2] bg-white p-3.5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-[#0B1530]">{title}</span>
        <span className="block truncate text-[11px] text-slate-500">{text}</span>
      </span>
      <Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
    </Link>
  );
}

const ACTIVITY_STYLE = {
  investment: { icon: 'down', tone: 'bg-indigo-50 text-indigo-600' },
  payment: { icon: 'up', tone: 'bg-emerald-50 text-emerald-600' },
  maturity: { icon: 'flag', tone: 'bg-amber-50 text-amber-600' },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const PortalInvestorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [allocation, setAllocation] = useState([]);
  const [activity, setActivity] = useState([]);
  const [horizons, setHorizons] = useState([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [sumRes, allocRes, histRes, cmpRes] = await Promise.allSettled([
        getInvestorSummary(),
        getInvestorAllocation(),
        getInvestorHistory({ limit: 6 }),
        getInvestorCompare({ period: '1y' }),
      ]);
      if (sumRes.status === 'rejected') throw sumRes.reason;
      setSummary(sumRes.value.data);
      setAllocation(allocRes.status === 'fulfilled' ? allocRes.value.data?.allocation || [] : []);
      setActivity(histRes.status === 'fulfilled' ? histRes.value.data?.events || [] : []);
      setHorizons(cmpRes.status === 'fulfilled' ? cmpRes.value.data?.horizons || [] : []);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error('Failed to load investor portfolio:', err);
      setError('We could not load your portfolio. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const nextDue = summary?.nextDue || null;
  const schedule = summary?.paymentSchedule || [];
  const recent = summary?.recentInvestments || [];

  const paid = Number(summary?.payoutsReceived) || 0;
  const pending = Number(summary?.pendingAmount) || 0;
  const pipeline = paid + pending;
  const realizedPct = pipeline > 0 ? Math.min(Math.round((paid / pipeline) * 100), 100) : 0;

  const filteredRecent = useMemo(
    () => recent.filter((item) => matchesStatus(item.status, statusFilter)),
    [recent, statusFilter]
  );

  /* ---------------------------- Loading / error ---------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <PortfolioCardSkeleton />
        <CardSkeleton count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Icon name="alert" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-bold text-slate-900">Dashboard unavailable</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => loadData()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#3347B8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263691]"
        >
          <Icon name="refresh" />
          Try again
        </button>
      </div>
    );
  }

  const dueLabel = nextDue
    ? nextDue.overdue
      ? `Overdue by ${plural(Math.abs(nextDue.daysLeft), 'day')}`
      : nextDue.daysLeft === 0
        ? 'Due today'
        : `Due in ${plural(nextDue.daysLeft, 'day')}`
    : '';

  const firstName = summary?.investorName ? summary.investorName.split(' ')[0] : '';

  /* --------------------------------- Render -------------------------------- */

  return (
    <div id="printable-statement" className="space-y-6 text-[#0B1530]">
      {/* ============================ HEADER ============================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-wealth-display text-2xl font-bold tracking-tight sm:text-[28px]">
            {firstName ? `Hello, ${firstName}` : 'Your portfolio'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here is where your capital stands today ·{' '}
            <span className="text-slate-400">
              updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Icon name="refresh" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print overview"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="print" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========================== QUICK ACTIONS ========================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/portal/investor/history"
          icon="history"
          title="Investment history"
          text="Every deposit and payout"
          tone="bg-indigo-50 text-indigo-600"
        />
        <QuickAction
          to="/portal/investor/compare"
          icon="compare"
          title="Compare returns"
          text="Invested vs. what you will get"
          tone="bg-emerald-50 text-emerald-600"
        />
        <QuickAction
          to="/portal/investor/investments"
          icon="file"
          title="Agreements"
          text="Terms and return types"
          tone="bg-amber-50 text-amber-600"
        />
        <QuickAction
          to="/portal/investor/payments"
          icon="wallet"
          title="Payout statement"
          text="Received payments"
          tone="bg-slate-100 text-slate-600"
        />
      </div>

      {/* ============================== HERO ============================== */}
      <section className="portfolio-card-glow relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="relative">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-300">Total invested</p>
              <div className="mt-1.5">
                <AmountText
                  amount={summary?.totalInvested}
                  className="font-wealth-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
                />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Across {plural(summary?.activeProjectsCount ?? 0, 'active project')} ·{' '}
                {plural(summary?.totalInvestmentsCount ?? 0, 'agreement')}
              </p>
              <div className="mt-4 inline-flex items-center gap-3 rounded-xl bg-white/10 px-3.5 py-2 text-xs">
                <span className="text-slate-300">Current value</span>
                <AmountText amount={summary?.currentValue} className="text-sm font-bold text-white" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-300">Return received</p>
                  <p className="mt-1 font-wealth-display text-3xl font-bold">{realizedPct}%</p>
                </div>
                <p className="text-right text-[11px] text-slate-400">
                  of agreed return
                  <span className="block text-sm font-bold text-white">
                    <AmountText amount={pipeline} />
                  </span>
                </p>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-700"
                  style={{ width: `${realizedPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <HeroStat
              label="Net return"
              hint="Profit earned to date"
              chip={
                summary?.roiPercentage != null && (
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    {summary.roiPercentage}% ROI
                  </span>
                )
              }
            >
              <AmountText amount={summary?.profitEarned} className="text-xl font-bold text-emerald-300" />
            </HeroStat>
            <HeroStat label="Payouts received" hint="Paid out to you so far">
              <AmountText amount={summary?.payoutsReceived} className="text-xl font-bold text-white" />
            </HeroStat>
            <HeroStat
              label="Still to receive"
              hint={
                summary?.pendingProjectsCount
                  ? `Across ${plural(summary.pendingProjectsCount, 'project')}`
                  : 'Nothing outstanding'
              }
            >
              <AmountText amount={summary?.pendingAmount} className="text-xl font-bold text-amber-300" />
            </HeroStat>
          </div>
        </div>
      </section>

      {/* ============================ NEXT DUE ============================ */}
      {nextDue && (
        <section
          className={`flex flex-col gap-4 rounded-2xl border-l-4 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
            nextDue.overdue ? 'border-rose-500 ring-1 ring-rose-100' : 'border-amber-400 ring-1 ring-slate-200/70'
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                nextDue.overdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Icon name="calendar" className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    nextDue.overdue ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {dueLabel}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next due</span>
              </div>
              <h3 className="mt-1 text-base font-bold">{nextDue.projectName}</h3>
              <p className="text-xs text-slate-500">
                Scheduled for <span className="font-semibold text-slate-700">{formatDate(nextDue.dueDate)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount due</p>
              <AmountText
                amount={nextDue.dueAmount}
                className={`font-wealth-display text-xl font-bold ${nextDue.overdue ? 'text-rose-600' : 'text-[#0B1530]'}`}
              />
            </div>
            <Link
              to="/portal/investor/payments"
              className="no-print inline-flex items-center gap-1.5 rounded-xl bg-[#3347B8] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#263691]"
            >
              Payments
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ===================== WHERE YOUR MONEY IS HEADING ===================== */}
      {horizons.length > 0 && (
        <Card
          title="Where your money is heading"
          subtitle="Expected total value of your agreements over time"
          action={
            <Link
              to="/portal/investor/compare"
              className="no-print inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Compare in detail
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {horizons.map((h) => (
              <div key={h.key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h.label}</p>
                <AmountText amount={h.expectedValue} className="mt-1 block font-wealth-display text-lg font-bold" />
                <p className="mt-1 text-[11px] text-slate-500">
                  Profit{' '}
                  <AmountText amount={h.expectedProfit} className="font-semibold text-emerald-600" />
                </p>
                <p className="text-[11px] text-slate-400">{formatDate(h.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================== ALLOCATION + PROGRESS ====================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          className="lg:col-span-7"
          title="Capital allocation"
          subtitle="How your money is spread across projects"
          action={
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {plural(allocation.length, 'project')}
            </span>
          }
        >
          <div className="flex min-h-[240px] items-center justify-center">
            <ProjectDonutChart allocation={allocation} />
          </div>
        </Card>

        <Card
          className="lg:col-span-5"
          title="Project progress"
          subtitle="Paid out versus agreed return"
          bodyClass="p-5 sm:p-6 space-y-5"
        >
          {schedule.length === 0 ? (
            <EmptyBlock title="No projects yet" text="Progress appears here once you have an agreement." />
          ) : (
            schedule.map((row) => {
              const pct = row.totalAmount > 0 ? Math.min(Math.round((row.paidAmount / row.totalAmount) * 100), 100) : 0;
              return (
                <div key={row.project}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{row.project}</p>
                    <span className="shrink-0 text-xs font-bold text-indigo-600">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3347B8] to-[#12B886] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                    <span>
                      Paid <AmountText amount={row.paidAmount} className="font-semibold text-slate-700" />
                    </span>
                    <span>
                      of <AmountText amount={row.totalAmount} className="font-semibold text-slate-700" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* ======================= RECENT INVESTMENTS ======================= */}
      <Card
        title="Recent investments"
        subtitle="Your latest agreements"
        bodyClass="p-0"
        action={
          <div className="no-print flex items-center gap-3">
            <Link
              to="/portal/investor/history"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Icon name="history" className="h-3.5 w-3.5" />
              Full history
            </Link>
            <Link
              to="/portal/investor/investments"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View all
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      >
        <div className="no-print flex gap-1.5 overflow-x-auto border-b border-slate-100 px-5 py-3.5 sm:px-6">
          {STATUS_FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === key
                  ? 'bg-[#3347B8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredRecent.length === 0 ? (
          <EmptyBlock title="No matching investments" text="Try a different filter." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Return type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecent.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">{formatDate(inv.investmentDate)}</td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/portal/investor/investments/${inv.id}`}
                          className="font-semibold hover:text-indigo-600"
                        >
                          {inv.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <ReturnTypeBadge type={inv.investmentType} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold">
                        <AmountText amount={inv.amount} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-emerald-700">
                        <AmountText amount={inv.paidAmount} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <AmountText
                          amount={inv.dueAmount}
                          className={inv.dueAmount > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right">
                        <StatusChip status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredRecent.map((inv) => (
                <li key={inv.id}>
                  <Link to={`/portal/investor/investments/${inv.id}`} className="block space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{inv.projectName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(inv.investmentDate)}</p>
                      </div>
                      <StatusChip status={inv.status} />
                    </div>
                    <ReturnTypeBadge type={inv.investmentType} />
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-400">Amount</p>
                        <AmountText amount={inv.amount} className="text-sm font-bold" />
                      </div>
                      <div>
                        <p className="text-slate-400">Paid</p>
                        <AmountText amount={inv.paidAmount} className="text-sm font-semibold text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-slate-400">Due</p>
                        <AmountText
                          amount={inv.dueAmount}
                          className={`text-sm font-semibold ${inv.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* ========================= RECENT ACTIVITY ========================= */}
      <Card
        title="Recent activity"
        subtitle="Latest deposits, payouts and maturities"
        bodyClass="p-0"
        action={
          <Link
            to="/portal/investor/history"
            className="no-print inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Icon name="history" className="h-3.5 w-3.5" />
            Investment history
          </Link>
        }
      >
        {activity.length === 0 ? (
          <EmptyBlock title="No activity yet" text="Deposits and payouts will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((ev) => {
              const style = ACTIVITY_STYLE[ev.type] || ACTIVITY_STYLE.investment;
              return (
                <li key={ev.key} className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
                    <Icon name={style.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {ev.title}
                      {ev.upcoming && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Upcoming
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {ev.projectName} · {formatDate(ev.date)}
                    </p>
                  </div>
                  <AmountText
                    amount={ev.amount}
                    className={`shrink-0 text-sm font-bold ${ev.type === 'payment' ? 'text-emerald-600' : 'text-[#0B1530]'}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default PortalInvestorDashboard;