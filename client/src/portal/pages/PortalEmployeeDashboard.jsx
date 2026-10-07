import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, CalendarX, CalendarDays, ArrowRight, Banknote, ListChecks,
  Loader2, Check, Clock, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  getEmployeeProfile,
  getAttendanceSummary,
  getSalaryMonths,
  downloadPayslip,
} from '../api/portalEmployee';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';
import CheckInCard from '../components/CheckInCard';
import SalaryCard from '../components/SalaryCard';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Removes the grey flash on tap and the 300ms double-tap delay on mobile
const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

const fmtDate = (d, withYear = false) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    : '';

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-3 w-24 bg-slate-200 rounded" />
      <div className="h-7 w-52 bg-slate-200 rounded" />
      <div className="h-28 bg-slate-200 rounded-3xl" />
      <div className="h-44 bg-slate-200 rounded-3xl" />
      <div className="h-24 bg-slate-200 rounded-2xl" />
    </div>
  );
}

function StatCard({ label, value, icon, tint }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tint}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Salary received tracker — 12 months, status only                     */
/* ------------------------------------------------------------------ */

function SalaryTracker({ joiningDate }) {
  const joinY = Number(String(joiningDate || '').slice(0, 4)) || null;
  const joinM = Number(String(joiningDate || '').slice(5, 7)) || 1;

  const [year, setYear] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSelected(null);
    getSalaryMonths(year || undefined)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        if (!year) setYear(d.year);
      })
      .catch(() => { if (!cancelled) setError('Could not load salary history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  const tileState = (m) => {
    if (!data) return 'none';
    if (joinY && data.year * 12 + m.month < joinY * 12 + joinM) return 'na';
    if (m.status === 'Paid') return 'paid';
    if (m.status === 'Draft') return 'processing';
    const isFuture = data.year > data.currentYear || (data.year === data.currentYear && m.month > data.currentMonth);
    if (isFuture) return 'upcoming';
    if (data.year === data.currentYear && m.month === data.currentMonth) return 'due';
    return 'none';
  };

  const STYLES = {
    paid: 'bg-emerald-50 border-emerald-200 text-emerald-700 active:bg-emerald-100',
    processing: 'bg-amber-50 border-amber-200 text-amber-700',
    due: 'bg-white border-dashed border-slate-300 text-slate-500',
    upcoming: 'bg-slate-50 border-slate-100 text-slate-300',
    none: 'bg-slate-50 border-slate-100 text-slate-400',
    na: 'bg-slate-50 border-slate-100 text-slate-300 opacity-50',
  };

  const LABELS = { paid: 'Paid', processing: 'Processing', due: 'Due', upcoming: '', none: '—', na: '—' };

  const paidCount = data ? data.months.filter((m) => m.status === 'Paid').length : 0;
  const minYear = joinY || (data ? data.currentYear - 3 : 2000);
  const selectedMonth = data && selected ? data.months.find((m) => m.month === selected) : null;

  const handleDownload = async () => {
    if (!selectedMonth?.slipId) return;
    setDownloading(true);
    setError('');
    try {
      await downloadPayslip(selectedMonth.slipId, `Payslip-${MONTH_SHORT[selectedMonth.month - 1]}-${data.year}.pdf`);
    } catch {
      setError('Could not download the payslip. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">Salary received</p>
          <p className="text-xs text-slate-400">
            {data ? `${paidCount} month${paidCount === 1 ? '' : 's'} paid in ${data.year}` : '\u00A0'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => setYear((y) => (y || data?.year) - 1)}
            disabled={!data || data.year <= minYear}
            className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30 ${TAP}`}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-slate-800 w-12 text-center">{data?.year || ''}</span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => setYear((y) => (y || data?.year) + 1)}
            disabled={!data || data.year >= data.currentYear}
            className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30 ${TAP}`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className={`grid grid-cols-4 sm:grid-cols-6 gap-2 ${loading ? 'opacity-50' : ''}`}>
        {(data?.months || Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }))).map((m) => {
          const state = tileState(m);
          const isSelected = selected === m.month;
          return (
            <button
              key={m.month}
              type="button"
              disabled={state !== 'paid'}
              onClick={() => setSelected(isSelected ? null : m.month)}
              className={`h-[68px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${TAP} ${STYLES[state]} ${
                isSelected ? 'ring-2 ring-emerald-400' : ''
              } disabled:cursor-default`}
            >
              <span className="flex items-center gap-1 text-sm font-bold">
                {MONTH_SHORT[m.month - 1]}
                {state === 'paid' && <Check size={13} />}
                {state === 'processing' && <Clock size={13} />}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">{LABELS[state]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Paid</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Processing</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-slate-300" />Due</span>
      </div>

      {selectedMonth && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {MONTH_LONG[selectedMonth.month - 1]} {data.year}
            </p>
            <p className="text-xs text-slate-400">Paid on {fmtDate(selectedMonth.paidDate, true)}</p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={`h-11 px-4 flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold rounded-xl active:bg-slate-700 disabled:opacity-60 shrink-0 ${TAP}`}
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Payslip
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PortalEmployeeDashboard() {
  const user = getPortalUser();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  const loadAttendance = () =>
    getAttendanceSummary({ view: 'month' }).then(setAttendance).catch(() => {});

  useEffect(() => {
    Promise.all([getEmployeeProfile(), getAttendanceSummary({ view: 'month' })])
      .then(([p, a]) => { setProfile(p); setAttendance(a); })
      .catch(() => setError('Could not load your dashboard right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      {loading && <DashboardSkeleton />}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
      )}

      {profile && (
        <>
          <div className="mb-4 md:mb-6">
            <p className="text-xs font-medium text-slate-400 mb-1">{todayLabel}</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {firstName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {profile.designation || 'Employee'} · {profile.department || '-'}
            </p>
          </div>

          {/*
            Mobile: one column in this order -> check-in, salary, attendance, shortcuts, requests, salary history.
            Desktop (md+): two columns. The wrappers use `contents` on mobile so the `order-*`
            classes can interleave the two groups.
          */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 items-start">
            <div className="contents md:block md:col-span-3 md:space-y-5">
              <div className="order-1 [&>*]:mb-0">
                <CheckInCard onChange={loadAttendance} />
              </div>
              <div className="order-2">
                <SalaryCard />
              </div>
              <div className="order-6">
                <SalaryTracker joiningDate={profile.joiningDate} />
              </div>
            </div>

            <div className="contents md:block md:col-span-2 md:space-y-5">
              <div className="order-3">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-base font-semibold text-slate-900">This Month</p>
                  <Link
                    to="/portal/employee/attendance"
                    className={`text-xs font-semibold text-slate-500 active:text-slate-900 py-2 pl-3 ${TAP}`}
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <StatCard
                    label="Present"
                    value={attendance?.counts?.present || 0}
                    icon={<CalendarCheck size={14} />}
                    tint="bg-emerald-50 text-emerald-600"
                  />
                  <StatCard
                    label="Absent"
                    value={attendance?.counts?.absent || 0}
                    icon={<CalendarX size={14} />}
                    tint="bg-red-50 text-red-500"
                  />
                  <StatCard
                    label="Leave"
                    value={attendance?.counts?.leave || 0}
                    icon={<CalendarDays size={14} />}
                    tint="bg-amber-50 text-amber-600"
                  />
                </div>
              </div>

              <div className="order-4 grid grid-cols-2 md:grid-cols-1 gap-3">
                <Link
                  to="/portal/employee/leave"
                  className={`bg-white border border-slate-200 rounded-2xl p-3.5 min-h-[84px] md:min-h-0 flex flex-col md:flex-row md:items-center justify-between gap-2 active:bg-slate-50 transition-colors ${TAP}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center md:hidden">
                    <CalendarDays size={18} />
                  </span>
                  <span className="flex items-center justify-between gap-2 md:flex-1">
                    <span className="text-sm font-semibold text-slate-800">Request Day Off</span>
                    <ArrowRight size={15} className="text-slate-400 hidden md:block" />
                  </span>
                </Link>
                <Link
                  to="/portal/employee/advance"
                  className={`bg-white border border-slate-200 rounded-2xl p-3.5 min-h-[84px] md:min-h-0 flex flex-col md:flex-row md:items-center justify-between gap-2 active:bg-slate-50 transition-colors ${TAP}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center md:hidden">
                    <Banknote size={18} />
                  </span>
                  <span className="flex items-center justify-between gap-2 md:flex-1">
                    <span className="text-sm font-semibold text-slate-800">Request Advance</span>
                    <Banknote size={15} className="text-slate-400 hidden md:block" />
                  </span>
                </Link>
              </div>

              <Link
                to="/portal/employee/requests"
                className={`order-5 flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 min-h-[56px] active:bg-slate-50 transition-colors ${TAP}`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <ListChecks size={18} />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">My Requests</span>
                </span>
                <ArrowRight size={15} className="text-slate-400" />
              </Link>
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  );
}