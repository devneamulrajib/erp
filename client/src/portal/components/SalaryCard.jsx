import { useCallback, useEffect, useState } from 'react';
import { Wallet, CalendarDays, Banknote, Eye, EyeOff, Loader2, ChevronDown, Lock } from 'lucide-react';
import { getSalarySummary, unlockSalary } from '../api/portalEmployee';
import { getUnlockToken, setUnlockToken, clearUnlockToken } from '../utils/salaryUnlock';
import BottomSheet from './BottomSheet';
import PasswordField from './PasswordField';

const AUTO_HIDE_SECONDS = 30;
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

const fmt = (n) => `৳${Number(n || 0).toLocaleString()}`;
const fmtDate = (d, withYear = false) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    : '';
const fmtRange = (from, to) => (from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`);

function Section({ icon, title, summary, open, onToggle, expandable = true, children }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        className={`w-full min-h-[52px] px-3.5 py-2 flex items-center gap-3 text-left ${TAP} ${
          expandable ? 'active:bg-white/10' : 'cursor-default'
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="block text-xs text-slate-400 truncate">{summary}</span>
        </span>
        {expandable && (
          <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expandable && open && <div className="px-3.5 pb-3.5 space-y-2.5">{children}</div>}
    </div>
  );
}

function Row({ label, value, tone = 'text-white' }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function UnlockSheet({ open, onClose, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPassword(''); setError(''); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { unlockToken, expiresInSeconds } = await unlockSalary(password);
      await onUnlocked(unlockToken, expiresInSeconds);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not verify your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title="Confirm it's you">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Enter your account password to view your salary. You won&apos;t be asked again for 5 minutes.
        </p>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className={`w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-700 disabled:opacity-50 ${TAP}`}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Unlock
        </button>
      </form>
    </BottomSheet>
  );
}

export default function SalaryCard() {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const [open, setOpen] = useState({ breakdown: false, advance: true, leave: true });
  const [showUnlock, setShowUnlock] = useState(false);

  const now = new Date();
  const headerLabel = `${MONTH_LONG[now.getMonth()]} ${now.getFullYear()}`;

  const hide = useCallback(() => {
    setRevealed(false);
    setData(null); // drop amounts from memory as soon as they are hidden
    setError('');
  }, []);

  const loadSummary = async (unlockToken) => {
    setLoading(true);
    setError('');
    try {
      const d = await getSalarySummary(unlockToken);
      setData(d);
      setSecondsLeft(AUTO_HIDE_SECONDS);
      setOpen({ breakdown: false, advance: true, leave: true });
      setRevealed(true);
    } catch (err) {
      if (err?.response?.status === 403 && err?.response?.data?.code === 'LOCKED') {
        clearUnlockToken();
        setShowUnlock(true);
      } else {
        setError('Could not load salary details. Tap to try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startReveal = async () => {
    if (loading) return;
    const token = getUnlockToken();
    if (!token) {
      setError('');
      setShowUnlock(true);
      return;
    }
    await loadSummary(token);
  };

  const handleUnlocked = async (token, seconds) => {
    setUnlockToken(token, seconds);
    setShowUnlock(false);
    await loadSummary(token);
  };

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  // Countdown while revealed
  useEffect(() => {
    if (!revealed) return undefined;
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [revealed]);

  useEffect(() => {
    if (revealed && secondsLeft === 0) hide();
  }, [revealed, secondsLeft, hide]);

  // Hide when the app / tab goes to the background (phone lock, app switch)
  useEffect(() => {
    if (!revealed) return undefined;
    const onVisibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [revealed, hide]);

  const advanceCount = data?.advances?.length || 0;
  const advanceLeft = (data?.advances || []).reduce((s, a) => s + a.remaining, 0);
  const pendingLeaves = (data?.leaves || []).filter((l) => l.status === 'Pending').length;

  const leaveSummary = !data
    ? ''
    : data.leaves.length === 0
      ? 'No day off this month'
      : `${data.approvedLeaveDays} day${data.approvedLeaveDays === 1 ? '' : 's'} approved${
          pendingLeaves ? ` · ${pendingLeaves} pending` : ''
        }`;

  return (
    <>
      <div
        className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 shadow-lg shadow-slate-900/10"
        onPointerDown={() => revealed && setSecondsLeft(AUTO_HIDE_SECONDS)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <Wallet size={14} className="shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide truncate">Salary · {headerLabel}</p>
          </div>
          <button
            type="button"
            onClick={revealed ? hide : startReveal}
            disabled={loading}
            aria-label={revealed ? 'Hide salary' : 'Show salary'}
            className={`w-11 h-11 -mr-1.5 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center shrink-0 disabled:opacity-60 ${TAP}`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : revealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Hidden state */}
        {!revealed && (
          <button
            type="button"
            onClick={startReveal}
            disabled={loading}
            className={`block w-full text-left rounded-2xl py-1 ${TAP}`}
          >
            <span className="block text-4xl font-bold tracking-[0.2em] text-white/90 select-none">৳ ••••••</span>
            <span className={`flex items-center gap-1.5 text-xs mt-2 ${error ? 'text-red-300' : 'text-slate-400'}`}>
              {!error && <Lock size={11} />}
              {error || 'Tap to unlock your salary, advance / loan and day off'}
            </span>
          </button>
        )}

        {/* Revealed state */}
        {revealed && data && (
          <div className="space-y-3.5">
            <div>
              <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-indigo-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsLeft / AUTO_HIDE_SECONDS) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Hides in {secondsLeft}s · any tap keeps it open</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-0.5">Gross salary</p>
              <p className="text-4xl font-bold tracking-tight">{fmt(data.gross)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Deductions</p>
                <p className="text-lg font-bold text-amber-300 truncate">
                  {data.totalDeduction > 0 ? `− ${fmt(data.totalDeduction)}` : fmt(0)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 p-3 min-w-0">
                <p className="text-xs text-slate-300 mb-0.5">{data.isEstimate ? 'Estimated net' : 'Net paid'}</p>
                <p className="text-lg font-bold text-emerald-300 truncate">{fmt(data.net)}</p>
              </div>
            </div>
            {!data.isEstimate && data.paidDate && (
              <p className="text-xs text-slate-400 -mt-1.5">Paid on {fmtDate(data.paidDate, true)}</p>
            )}

            <Section
              icon={<Banknote size={18} className="text-amber-300" />}
              title="Advance / loan"
              summary={advanceCount === 0 ? 'None this month' : `${advanceCount} active · ${fmt(advanceLeft)} left`}
              expandable={advanceCount > 0}
              open={open.advance}
              onToggle={() => toggle('advance')}
            >
              {data.advances.map((a) => {
                const pct = a.amount > 0 ? Math.min(100, Math.round((a.paidAmount / a.amount) * 100)) : 0;
                const note =
                  a.dueThisMonth > 0
                    ? `${fmt(a.dueThisMonth)} deducted this month`
                    : a.status === 'Pending'
                      ? 'Awaiting approval'
                      : a.status === 'Approved'
                        ? 'Awaiting disbursement'
                        : '';
                return (
                  <div key={a.id} className="rounded-xl bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{a.type}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide bg-white/10 text-slate-300 rounded px-1.5 py-0.5">
                          {a.status}
                        </span>
                      </div>
                      <p className="text-base font-bold shrink-0">{fmt(a.amount)}</p>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-300 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {fmt(a.paidAmount)} repaid · {fmt(a.remaining)} left
                    </p>
                    {note && <p className="mt-0.5 text-xs text-amber-300">{note}</p>}
                    {a.takenThisMonth && <p className="mt-0.5 text-xs text-amber-300">Taken this month</p>}
                  </div>
                );
              })}
            </Section>

            <Section
              icon={<CalendarDays size={18} className="text-sky-300" />}
              title="Day off"
              summary={leaveSummary}
              expandable={data.leaves.length > 0}
              open={open.leave}
              onToggle={() => toggle('leave')}
            >
              {data.leaves.map((l) => (
                <div key={l.id} className="rounded-xl bg-black/20 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{fmtRange(l.fromDate, l.toDate)}</p>
                    {l.reason && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{l.reason}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{l.days} day{l.days === 1 ? '' : 's'}</p>
                    <p className={`text-[11px] font-semibold uppercase ${l.status === 'Approved' ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {l.status}
                    </p>
                  </div>
                </div>
              ))}
            </Section>

            <Section
              icon={<Wallet size={18} className="text-indigo-300" />}
              title="Salary breakdown"
              summary="Basic, allowances and adjustments"
              open={open.breakdown}
              onToggle={() => toggle('breakdown')}
            >
              <div className="rounded-xl bg-black/20 p-3 space-y-2">
                <Row label="Basic" value={fmt(data.basicSalary)} />
                <Row label="House Rent" value={fmt(data.houseRent)} />
                <Row label="Medical" value={fmt(data.medicalAllowance)} />
                <Row label="Other" value={fmt(data.otherAllowance)} />
                <div className="border-t border-white/10 pt-2 space-y-2">
                  <Row label="Gross" value={fmt(data.gross)} />
                  {data.advanceDeduction > 0 && (
                    <Row label="Advance / loan" value={`− ${fmt(data.advanceDeduction)}`} tone="text-amber-300" />
                  )}
                  {data.otherDeduction > 0 && (
                    <Row label="Other deductions" value={`− ${fmt(data.otherDeduction)}`} tone="text-amber-300" />
                  )}
                  {data.otherAddition > 0 && (
                    <Row label="Additions / bonus" value={`+ ${fmt(data.otherAddition)}`} tone="text-emerald-300" />
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>

      <UnlockSheet open={showUnlock} onClose={() => setShowUnlock(false)} onUnlocked={handleUnlocked} />
    </>
  );
}