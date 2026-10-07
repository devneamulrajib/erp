// client/src/pages/InvestorDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import {
  getDashboardSummary,
  getInvestors,
  createInvestor,
  createInvestment,
} from '../api/investor';
import { getProjects } from '../api/project';
import { getChartOfAccounts } from '../api/chartOfAccounts';

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/*   river   #0F2E2B  deep green-black (hero, primary buttons)         */
/*   mist    #EDF1EF  page background                                  */
/*   mint    #7BC8A4  paid out                                         */
/*   jute    #E3B04B  still owed / accents on dark                     */
/*   leaf    #1F7A5C  profit / realized / focus                        */
/* ------------------------------------------------------------------ */

const DESIGN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap');
.ip-root { font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; }
.ip-display { font-family: 'Bricolage Grotesque', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
@keyframes ip-drawer-in { from { transform: translateX(28px); opacity: 0; } to { transform: none; opacity: 1; } }
.ip-drawer { animation: ip-drawer-in .22s ease-out; }
@media (prefers-reduced-motion: reduce) { .ip-drawer { animation: none; } }
`;

const PROJECT_COLORS = ['#1F7A5C', '#E3B04B', '#2F6F9F', '#B5533C', '#6B5B95', '#7A8B8A'];

const STATUS_TABS = [
  ['', 'All'],
  ['active', 'Active'],
  ['matured', 'Matured'],
  ['partially_returned', 'Partially returned'],
  ['fully_returned', 'Fully returned'],
];

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  matured: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  partially_returned: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  fully_returned: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusLabel = (status) => String(status || 'active').replace(/_/g, ' ');

const emptyInvestorForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  nidPassport: '',
  startDate: today(),
  investmentType: 'project_based',
  profitSharePercent: '',
  fixedReturnPercent: '',
  notes: '',
});

const emptyInvestmentForm = () => ({
  investorId: '',
  projectId: '',
  principalAmount: '',
  investmentDate: today(),
  maturityDate: '',
  investmentType: 'project_based',
  profitSharePercent: '',
  expectedRoiPercent: '',
  expectedProfit: '',
  debitAccountId: '',
  notes: '',
});

const toList = (res) => {
  const list = res?.data ?? res ?? [];
  return Array.isArray(list) ? list : [];
};

// Same formula the submit handler uses, shared so the live preview always matches what is saved
const calcExpected = (form) => {
  const principal = Number(form.principalAmount) || 0;
  const expectedProfit = form.expectedProfit
    ? Number(form.expectedProfit)
    : (principal * (Number(form.expectedRoiPercent) || 0)) / 100;
  return { principal, expectedProfit, expectedReturn: principal + expectedProfit };
};

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#1F7A5C] focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/20';

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

function Skeleton({ className = '', dark = false }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-md ${dark ? 'bg-white/10' : 'bg-slate-200/80'} ${className}`}
    />
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function FormSection({ title, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-[#0F2E2B] w-full">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CompactSelect({ label, value, onChange, children }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className={`h-9 cursor-pointer appearance-none rounded-lg border bg-white py-1.5 pl-3 pr-8 text-sm font-medium transition focus:border-[#1F7A5C] focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/20 ${
          value ? 'border-[#1F7A5C] text-[#0F2E2B]' : 'border-slate-300 text-slate-600'
        } hover:border-slate-400`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
        <ChevronIcon />
      </span>
    </div>
  );
}

function Ring({ percent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  return (
    <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#E3E9E6" strokeWidth="12" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="#1F7A5C"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function Drawer({ title, description, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0A1716]/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ip-drawer flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#0F2E2B] px-6 py-5 text-white">
          <div>
            <h2 className="ip-display text-xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-white/65">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function DrawerFooter({ onCancel, submitting, submitLabel, submittingLabel }) {
  return (
    <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/30"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-[#0F2E2B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#164440] focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InvestorDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  // Modals
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    investorId: '',
    projectId: '',
    status: '',
  });

  const [investorForm, setInvestorForm] = useState(emptyInvestorForm());
  const [investmentForm, setInvestmentForm] = useState(emptyInvestmentForm());

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSummary(filters);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvestors = async () => {
    try {
      const res = await getInvestors();
      setInvestors(toList(res));
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(toList(res));
    } catch (err) {
      console.error(err);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await getChartOfAccounts();
      const all = toList(res);
      const filtered = all.filter(
        (a) =>
          a.type === 'Asset' ||
          /bank|cash/i.test(a.name || '') ||
          /bank|cash/i.test(a.chartOfGroup?.name || '')
      );
      setCashBankAccounts(filtered.length ? filtered : all);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInvestors();
    loadProjects();
    loadAccounts();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [filters]);

  const handleCreateInvestor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInvestor(investorForm);
      setShowAddInvestorModal(false);
      setInvestorForm(emptyInvestorForm());
      await Promise.all([loadInvestors(), loadSummary()]);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvestment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { expectedProfit, expectedReturn } = calcExpected(investmentForm);

      await createInvestment({
        ...investmentForm,
        expectedProfit,
        expectedReturn,
      });

      setShowAddInvestmentModal(false);
      setInvestmentForm(emptyInvestmentForm());
      await loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const setInv = (key) => (e) => setInvestorForm({ ...investorForm, [key]: e.target.value });
  const setInvt = (key) => (e) => setInvestmentForm({ ...investmentForm, [key]: e.target.value });

  // Data helpers
  const kpis = data?.kpis || {};
  const breakdown = Object.entries(data?.projectBreakdown || {}).sort(
    (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
  );

  // Recent investments list (from API or fallback)
  const recentInvestments = data?.recentInvestments || [];
  const showDateColumn = recentInvestments.some((i) => i.investmentDate || i.date);
  const columnCount = showDateColumn ? 5 : 4;

  // Active investor count calculation
  const activeInvestorsCount =
    data?.activeInvestorsCount ??
    investors.filter((i) => i.status === 'active' || !i.status).length;

  // Liability bar ratio calculation (empty bar when nothing has been recorded yet)
  const paidOutAmount = Number(kpis.totalPaid || 0);
  const stillOwedAmount = Number(kpis.outstandingLiability || 0);
  const totalLiabilityPool = paidOutAmount + stillOwedAmount;
  const paidPercent = totalLiabilityPool > 0 ? (paidOutAmount / totalLiabilityPool) * 100 : 0;
  const owedPercent = totalLiabilityPool > 0 ? (stillOwedAmount / totalLiabilityPool) * 100 : 0;

  // Target vs Realized calculation
  const targetProfit = Number(kpis.expectedProfit || 0);
  const realizedProfit = Number(kpis.profitGenerated || 0);
  const realizedPercentOfTarget =
    targetProfit > 0 ? Math.round((realizedProfit / targetProfit) * 100) : 0;
  const profitGap = targetProfit - realizedProfit;

  const totalInvestedNum = Number(kpis.totalInvested || 0);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const initialLoading = loading && !data;
  const refreshing = loading && !!data;

  const investmentPreview = calcExpected(investmentForm);
  const showFixedReturn =
    investorForm.investmentType === 'fixed_return' || investorForm.investmentType === 'hybrid';

  return (
    <div className="ip-root min-h-screen bg-[#EDF1EF] pb-20 text-[#11201F] antialiased">
      <style>{DESIGN_CSS}</style>
      <Topbar />

      {/* ============================================================ */}
      {/* HERO: what we still owe                                       */}
      {/* ============================================================ */}
      <section className="bg-[#0F2E2B] pb-28 pt-8 text-white">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h1 className="ip-display text-2xl font-semibold sm:text-3xl">Investor portfolio</h1>
              <p className="mt-1 text-sm text-white/60 sm:text-base">
                Capital, returns, and payouts across all investors
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddInvestorModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <PlusIcon />
                Add investor
              </button>
              <button
                type="button"
                onClick={() => setShowAddInvestmentModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E3B04B] px-4 py-2.5 text-sm font-semibold text-[#0F2E2B] transition hover:bg-[#ecc063] focus:outline-none focus:ring-2 focus:ring-[#E3B04B]/60 focus:ring-offset-2 focus:ring-offset-[#0F2E2B]"
              >
                <PlusIcon />
                New investment
              </button>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-white/60">
                Net liability: principal and profit still owed
              </p>
              <p className="ip-display mt-2 text-5xl font-semibold tabular-nums sm:text-7xl">
                {initialLoading ? (
                  <Skeleton dark className="h-14 w-72 sm:h-[72px]" />
                ) : (
                  formatBDT(kpis.outstandingLiability)
                )}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-5 py-3">
              <p className="text-xs text-white/60">Total ROI</p>
              <p className="ip-display mt-0.5 text-3xl font-semibold tabular-nums text-[#E3B04B]">
                {initialLoading ? <Skeleton dark className="h-8 w-16" /> : `${kpis.roiPercent || 0}%`}
              </p>
            </div>
          </div>

          {/* Liability split */}
          <div
            className="mt-8 flex h-14 w-full gap-1.5 overflow-hidden rounded-xl bg-white/10 p-1.5"
            role="img"
            aria-label={`Paid out ${Math.round(paidPercent)} percent, still owed ${Math.round(owedPercent)} percent`}
          >
            {totalLiabilityPool === 0 ? (
              <div className="flex w-full items-center px-3 text-sm text-white/50">
                {initialLoading ? 'Loading...' : 'Nothing recorded yet'}
              </div>
            ) : (
              <>
                {paidPercent > 0 && (
                  <div
                    className="flex min-w-[3rem] items-center rounded-lg bg-[#7BC8A4] px-3 text-sm font-semibold text-[#0F2E2B] transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  >
                    {Math.round(paidPercent)}%
                  </div>
                )}
                {owedPercent > 0 && (
                  <div
                    className="flex min-w-[3rem] items-center justify-end rounded-lg bg-[#E3B04B] px-3 text-sm font-semibold text-[#0F2E2B] transition-all duration-500"
                    style={{ width: `${owedPercent}%` }}
                  >
                    {Math.round(owedPercent)}%
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-sm bg-[#7BC8A4]" />
              <span className="text-white/65">Paid out</span>
              <span className="font-semibold tabular-nums">{formatBDT(paidOutAmount)}</span>
            </div>
            <div className="flex items-center gap-2.5 sm:justify-end">
              <span className="h-3 w-3 rounded-sm bg-[#E3B04B]" />
              <span className="text-white/65">Still owed</span>
              <span className="font-semibold tabular-nums">{formatBDT(stillOwedAmount)}</span>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-14 max-w-[1240px] space-y-6 px-4 sm:px-6 lg:px-8">
        {/* ========================================================== */}
        {/* KEY FIGURES                                                 */}
        {/* ========================================================== */}
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="rounded-xl bg-white p-4 shadow-md shadow-[#0F2E2B]/10 sm:p-5">
            <dt className="text-sm text-slate-500">Total invested</dt>
            <dd className="ip-display mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {initialLoading ? <Skeleton className="h-7 w-28" /> : formatBDT(kpis.totalInvested)}
            </dd>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md shadow-[#0F2E2B]/10 sm:p-5">
            <dt className="text-sm text-slate-500">Profit generated</dt>
            <dd className="ip-display mt-1.5 text-xl font-semibold tabular-nums text-[#1F7A5C] sm:text-2xl">
              {initialLoading ? <Skeleton className="h-7 w-28" /> : formatBDT(kpis.profitGenerated)}
            </dd>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md shadow-[#0F2E2B]/10 sm:p-5">
            <dt className="text-sm text-slate-500">Paid out</dt>
            <dd className="ip-display mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {initialLoading ? <Skeleton className="h-7 w-28" /> : formatBDT(kpis.totalPaid)}
            </dd>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md shadow-[#0F2E2B]/10 sm:p-5">
            <dt className="text-sm text-slate-500">Investors</dt>
            <dd className="ip-display mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {initialLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  {activeInvestorsCount}{' '}
                  <span className="text-base font-medium text-slate-500">active</span>
                </>
              )}
            </dd>
          </div>
        </dl>

        <div
          aria-busy={loading}
          className={`grid grid-cols-1 items-start gap-6 transition-opacity duration-200 lg:grid-cols-12 ${
            refreshing ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {/* ======================================================== */}
          {/* INVESTMENTS TABLE (primary content, filters live here)    */}
          {/* ======================================================== */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 lg:col-span-8">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <h2 className="ip-display text-lg font-semibold">Recent investments</h2>
              <button
                type="button"
                onClick={() => navigate('/investors/dashboard')}
                className="rounded text-sm font-medium text-[#1F7A5C] transition hover:text-[#0F2E2B] hover:underline focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/30"
              >
                View all
              </button>
            </div>

            {/* Status tabs */}
            <div className="mt-4 flex gap-1 overflow-x-auto px-5 sm:px-6" role="group" aria-label="Filter by status">
              {STATUS_TABS.map(([value, label]) => {
                const selected = filters.status === value;
                return (
                  <button
                    key={value || 'all'}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilters({ ...filters, status: value })}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/30 ${
                      selected
                        ? 'bg-[#0F2E2B] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Investor / project filters */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
              <CompactSelect
                label="Filter by investor"
                value={filters.investorId}
                onChange={(e) => setFilters({ ...filters, investorId: e.target.value })}
              >
                <option value="">All investors</option>
                {investors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </CompactSelect>

              <CompactSelect
                label="Filter by project"
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </CompactSelect>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({ investorId: '', projectId: '', status: '' })}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-[#1F7A5C] transition hover:bg-[#1F7A5C]/10 focus:outline-none focus:ring-2 focus:ring-[#1F7A5C]/30"
                >
                  Clear filters ({activeFilterCount})
                </button>
              )}

              {refreshing && (
                <span className="inline-flex items-center gap-2 pl-1 text-xs text-slate-500" role="status">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1F7A5C]" />
                  Updating
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium sm:px-6">Investor</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    {showDateColumn && <th className="px-4 py-3 font-medium">Date</th>}
                    <th className="px-4 py-3 text-right font-medium">Principal</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                  {initialLoading ? (
                    [0, 1, 2, 3].map((n) => (
                      <tr key={n}>
                        <td colSpan={columnCount} className="px-6 py-4">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : recentInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={columnCount} className="px-6 py-14 text-center">
                        <p className="text-sm font-semibold text-slate-800">No investments to show</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {activeFilterCount > 0
                            ? 'Nothing matches these filters. Clear a filter to see more.'
                            : 'Record the first investment and it will appear here.'}
                        </p>
                        {activeFilterCount === 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddInvestmentModal(true)}
                            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#0F2E2B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#164440]"
                          >
                            <PlusIcon />
                            New investment
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    recentInvestments.map((inv) => {
                      const investorName = inv.investor?.name || inv.investorName || '';
                      const status = inv.status || 'active';
                      return (
                        <tr key={inv.id || inv.code} className="transition hover:bg-[#F5F8F6]">
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F2E2B] text-sm font-semibold text-[#E3B04B]">
                                {(investorName.trim()[0] || '?').toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{investorName}</p>
                                <p className="font-mono text-xs text-slate-500">
                                  {inv.investmentCode || inv.code}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {inv.project?.name || inv.projectName || 'General business'}
                          </td>
                          {showDateColumn && (
                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                              {formatDate(inv.investmentDate || inv.date)}
                            </td>
                          )}
                          <td className="ip-display whitespace-nowrap px-4 py-3.5 text-right text-base font-semibold tabular-nums">
                            {formatBDT(inv.principalAmount || inv.principal)}
                          </td>
                          <td className="px-5 py-3.5 sm:px-6">
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
                                STATUS_STYLES[status] || STATUS_STYLES.active
                              }`}
                            >
                              {statusLabel(status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ======================================================== */}
          {/* SIDEBAR                                                   */}
          {/* ======================================================== */}
          <div className="space-y-6 lg:col-span-4">
            {/* Profit: target vs realized */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
              <h2 className="ip-display text-lg font-semibold">Profit: target vs realized</h2>

              <div className="mt-5 flex items-center gap-5">
                <div className="relative h-32 w-32 shrink-0">
                  <Ring percent={realizedPercentOfTarget} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="ip-display text-2xl font-semibold tabular-nums">
                      {realizedPercentOfTarget}%
                    </span>
                    <span className="text-xs text-slate-500">of target</span>
                  </div>
                </div>

                <dl className="min-w-0 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Realized</dt>
                    <dd className="ip-display text-lg font-semibold tabular-nums text-[#1F7A5C]">
                      {formatBDT(realizedProfit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Target</dt>
                    <dd className="ip-display text-lg font-semibold tabular-nums">
                      {formatBDT(targetProfit)}
                    </dd>
                  </div>
                </dl>
              </div>

              {targetProfit > 0 && !initialLoading && (
                <p className="mt-5 rounded-lg bg-[#EDF1EF] px-3.5 py-3 text-sm text-slate-700">
                  {profitGap > 0 ? (
                    <>
                      <span className="font-semibold tabular-nums text-[#0F2E2B]">
                        {formatBDT(profitGap)}
                      </span>{' '}
                      left to reach the target.
                    </>
                  ) : (
                    <>
                      Target exceeded by{' '}
                      <span className="font-semibold tabular-nums text-[#1F7A5C]">
                        {formatBDT(Math.abs(profitGap))}
                      </span>
                      .
                    </>
                  )}
                </p>
              )}
            </section>

            {/* Capital by project */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
              <h2 className="ip-display text-lg font-semibold">Capital by project</h2>

              {initialLoading ? (
                <div className="mt-5 space-y-4">
                  <Skeleton className="h-3 w-full" />
                  {[0, 1, 2].map((n) => (
                    <Skeleton key={n} className="h-5 w-full" />
                  ))}
                </div>
              ) : breakdown.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No investments recorded yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Capital will be split by project here.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="mt-5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label="Share of capital by project"
                  >
                    {breakdown.map(([project, amount], idx) => {
                      const share = totalInvestedNum > 0 ? (Number(amount) / totalInvestedNum) * 100 : 0;
                      if (share <= 0) return null;
                      return (
                        <div
                          key={project}
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${share}%`,
                            backgroundColor: PROJECT_COLORS[idx % PROJECT_COLORS.length],
                          }}
                        />
                      );
                    })}
                  </div>

                  <ul className="mt-5 space-y-3.5">
                    {breakdown.map(([project, amount], idx) => {
                      const pct =
                        kpis.totalInvested > 0
                          ? Math.round((amount / kpis.totalInvested) * 100)
                          : 0;
                      return (
                        <li key={project} className="flex items-center gap-3 text-sm">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: PROJECT_COLORS[idx % PROJECT_COLORS.length] }}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
                            {project || 'General business'}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                            {formatBDT(amount)}
                          </span>
                          <span className="w-10 shrink-0 text-right tabular-nums text-slate-400">
                            {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 1. ADD INVESTOR DRAWER                                        */}
      {/* ============================================================ */}
      {showAddInvestorModal && (
        <Drawer
          title="Add investor"
          description="Register someone who puts capital into the business."
          onClose={() => setShowAddInvestorModal(false)}
        >
          <form onSubmit={handleCreateInvestor} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <FormSection title="Contact details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name" required>
                    <input
                      type="text"
                      required
                      value={investorForm.name}
                      onChange={setInv('name')}
                      className={inputCls}
                      placeholder="e.g. Rahim"
                    />
                  </Field>
                  <Field label="Phone" required>
                    <input
                      type="text"
                      required
                      value={investorForm.phone}
                      onChange={setInv('phone')}
                      className={inputCls}
                      placeholder="+880 1..."
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      value={investorForm.email}
                      onChange={setInv('email')}
                      className={inputCls}
                      placeholder="investor@example.com"
                    />
                  </Field>
                  <Field label="NID / Passport">
                    <input
                      type="text"
                      value={investorForm.nidPassport}
                      onChange={setInv('nidPassport')}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Address">
                  <textarea
                    rows="2"
                    value={investorForm.address}
                    onChange={setInv('address')}
                    className={inputCls}
                  />
                </Field>
              </FormSection>

              <FormSection title="Investment terms">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Start date">
                    <input
                      type="date"
                      required
                      value={investorForm.startDate}
                      onChange={setInv('startDate')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Investment type">
                    <select
                      value={investorForm.investmentType}
                      onChange={setInv('investmentType')}
                      className={inputCls}
                    >
                      <option value="project_based">Project based</option>
                      <option value="fixed_return">Fixed return</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Profit share %">
                    <input
                      type="number"
                      step="0.01"
                      value={investorForm.profitSharePercent}
                      onChange={setInv('profitSharePercent')}
                      className={inputCls}
                      placeholder="20"
                    />
                  </Field>
                  {showFixedReturn && (
                    <Field label="Fixed return %">
                      <input
                        type="number"
                        step="0.01"
                        value={investorForm.fixedReturnPercent}
                        onChange={setInv('fixedReturnPercent')}
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>

                <Field label="Notes">
                  <textarea
                    rows="2"
                    value={investorForm.notes}
                    onChange={setInv('notes')}
                    className={inputCls}
                  />
                </Field>
              </FormSection>
            </div>

            <DrawerFooter
              onCancel={() => setShowAddInvestorModal(false)}
              submitting={submitting}
              submitLabel="Register investor"
              submittingLabel="Saving..."
            />
          </form>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* 2. NEW INVESTMENT DRAWER                                      */}
      {/* ============================================================ */}
      {showAddInvestmentModal && (
        <Drawer
          title="New investment"
          description="Record capital received from an investor."
          onClose={() => setShowAddInvestmentModal(false)}
        >
          <form onSubmit={handleCreateInvestment} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <FormSection title="Who and where">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Investor" required>
                    <select
                      required
                      value={investmentForm.investorId}
                      onChange={setInvt('investorId')}
                      className={inputCls}
                    >
                      <option value="">Choose investor</option>
                      {investors.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Project">
                    <select
                      value={investmentForm.projectId}
                      onChange={setInvt('projectId')}
                      className={inputCls}
                    >
                      <option value="">General business</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Amount and deposit">
                <Field label="Principal amount (৳)" required>
                  <input
                    type="number"
                    required
                    min="1"
                    value={investmentForm.principalAmount}
                    onChange={setInvt('principalAmount')}
                    className={`${inputCls} ip-display text-lg font-semibold tabular-nums`}
                    placeholder="1000000"
                  />
                </Field>
                <Field label="Deposit ledger">
                  <select
                    value={investmentForm.debitAccountId}
                    onChange={setInvt('debitAccountId')}
                    className={inputCls}
                  >
                    <option value="">Select cash / bank account...</option>
                    {cashBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </FormSection>

              <FormSection title="Dates and returns">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Investment date">
                    <input
                      type="date"
                      required
                      value={investmentForm.investmentDate}
                      onChange={setInvt('investmentDate')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Maturity date">
                    <input
                      type="date"
                      value={investmentForm.maturityDate}
                      onChange={setInvt('maturityDate')}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Profit share %">
                    <input
                      type="number"
                      step="0.01"
                      value={investmentForm.profitSharePercent}
                      onChange={setInvt('profitSharePercent')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Expected ROI %">
                    <input
                      type="number"
                      step="0.01"
                      value={investmentForm.expectedRoiPercent}
                      onChange={setInvt('expectedRoiPercent')}
                      className={inputCls}
                    />
                  </Field>
                </div>

                {investmentPreview.principal > 0 && (
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#0F2E2B] p-4 text-white">
                    <div>
                      <p className="text-xs text-white/60">Expected profit</p>
                      <p className="ip-display mt-0.5 text-lg font-semibold tabular-nums text-[#7BC8A4]">
                        {formatBDT(investmentPreview.expectedProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Expected return</p>
                      <p className="ip-display mt-0.5 text-lg font-semibold tabular-nums">
                        {formatBDT(investmentPreview.expectedReturn)}
                      </p>
                    </div>
                  </div>
                )}

                <Field label="Notes">
                  <textarea
                    rows="2"
                    value={investmentForm.notes}
                    onChange={setInvt('notes')}
                    className={inputCls}
                  />
                </Field>
              </FormSection>
            </div>

            <DrawerFooter
              onCancel={() => setShowAddInvestmentModal(false)}
              submitting={submitting}
              submitLabel="Record investment"
              submittingLabel="Recording..."
            />
          </form>
        </Drawer>
      )}
    </div>
  );
}