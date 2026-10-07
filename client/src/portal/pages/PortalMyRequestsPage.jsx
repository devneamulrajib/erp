import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Banknote, CalendarClock, Plus, Loader2 } from 'lucide-react';
import {
  getEmployeeLeaveRequests,
  getEmployeeAdvances,
  getAttendanceCorrections,
  cancelLeaveRequest,
  cancelAdvanceRequest,
  cancelAttendanceCorrection,
} from '../api/portalEmployee';
import PortalLayout from '../components/PortalLayout';
import BottomSheet from '../components/BottomSheet';
import CorrectionSheet from '../components/CorrectionSheet';

const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

const fmtMoney = (n) => `৳${Number(n || 0).toLocaleString()}`;
const fmtDate = (d, withYear = true) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    : '';
const fmtRange = (from, to) => (from === to ? fmtDate(from) : `${fmtDate(from, false)} – ${fmtDate(to)}`);

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-sky-50 text-sky-700 border-sky-200',
  Disbursed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const KINDS = {
  leave: { label: 'Day off', icon: CalendarDays, tint: 'bg-sky-50 text-sky-600' },
  advance: { label: 'Advance', icon: Banknote, tint: 'bg-amber-50 text-amber-600' },
  attendance: { label: 'Attendance', icon: CalendarClock, tint: 'bg-violet-50 text-violet-600' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'leave', label: 'Day off' },
  { id: 'advance', label: 'Advance' },
  { id: 'attendance', label: 'Attendance' },
];

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

/* ------------------------------------------------------------------ */

function RequestCard({ item, onCancel }) {
  const kind = KINDS[item.kind];
  const Icon = kind.icon;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kind.tint}`}>
          <Icon size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLES[item.status] || STATUS_STYLES.Pending}`}>
              {item.status}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{item.subtitle}</p>
          {item.reason && <p className="text-xs text-slate-400 mt-1 line-clamp-2">“{item.reason}”</p>}
          {item.adminNote && (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 mt-2">
              <span className="font-semibold">HR note:</span> {item.adminNote}
            </p>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <p className="text-[11px] text-slate-400">Requested {fmtDate(item.createdAt)}</p>
            {item.status === 'Pending' && (
              <button
                type="button"
                onClick={() => onCancel(item)}
                className={`text-xs font-semibold text-red-600 px-3 py-2 -my-2 -mr-2 rounded-lg active:bg-red-50 ${TAP}`}
              >
                Cancel request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function PortalMyRequestsPage() {
  const [leaves, setLeaves] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCorrection, setShowCorrection] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [l, a, c] = await Promise.all([
        getEmployeeLeaveRequests(),
        getEmployeeAdvances(),
        getAttendanceCorrections(),
      ]);
      setLeaves(l);
      setAdvances(a);
      setCorrections(c);
    } catch {
      setError('Could not load your requests. Pull down or refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    const list = [
      ...leaves.map((r) => ({
        key: `leave-${r.id}`,
        kind: 'leave',
        id: r.id,
        title: 'Day off',
        subtitle: `${fmtRange(r.fromDate, r.toDate)} · ${r.days} day${r.days === 1 ? '' : 's'}`,
        reason: r.reason,
        adminNote: r.adminNote,
        status: r.status,
        createdAt: r.createdAt,
      })),
      ...advances.map((r) => ({
        key: `advance-${r.id}`,
        kind: 'advance',
        id: r.id,
        title: r.type,
        subtitle: `${fmtMoney(r.amount)} · ${r.repaymentMonths} month${r.repaymentMonths === 1 ? '' : 's'}${
          r.targetMonth && r.targetYear ? ` · from ${r.targetMonth}/${r.targetYear}` : ''
        }`,
        reason: r.reason,
        adminNote: '',
        status: r.status,
        createdAt: r.createdAt,
      })),
      ...corrections.map((r) => ({
        key: `attendance-${r.id}`,
        kind: 'attendance',
        id: r.id,
        title: 'Attendance correction',
        subtitle: `For ${fmtDate(r.date)}`,
        reason: r.reason,
        adminNote: r.adminNote,
        status: r.status,
        createdAt: r.createdAt,
      })),
    ];
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leaves, advances, corrections]);

  const visible = filter === 'all' ? items : items.filter((i) => i.kind === filter);
  const pendingCount = items.filter((i) => i.status === 'Pending').length;
  const countFor = (id) => (id === 'all' ? items.length : items.filter((i) => i.kind === id).length);

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError('');
    try {
      if (toCancel.kind === 'leave') await cancelLeaveRequest(toCancel.id);
      else if (toCancel.kind === 'advance') await cancelAdvanceRequest(toCancel.id);
      else await cancelAttendanceCorrection(toCancel.id);
      setToCancel(null);
      await load();
    } catch (err) {
      setCancelError(errMsg(err, 'Could not cancel this request.'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <PortalLayout>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} waiting for a decision` : 'Everything is up to date'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCorrection(true)}
          className={`h-11 pl-3 pr-4 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-1.5 active:bg-slate-700 shrink-0 ${TAP}`}
        >
          <Plus size={16} /> Correction
        </button>
      </div>

      {/* Filter chips (scroll sideways on small phones) */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${TAP} ${
              filter === f.id
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-600 active:bg-slate-100'
            }`}
          >
            {f.label} <span className={filter === f.id ? 'text-slate-300' : 'text-slate-400'}>{countFor(f.id)}</span>
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No requests yet</p>
          <p className="text-xs text-slate-400 mt-1">Day off, advance and attendance requests will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <RequestCard key={item.key} item={item} onCancel={(i) => { setCancelError(''); setToCancel(i); }} />
          ))}
        </div>
      )}

      <CorrectionSheet
        open={showCorrection}
        onClose={() => setShowCorrection(false)}
        onDone={() => { setShowCorrection(false); setFilter('all'); load(); }}
      />

      <BottomSheet open={!!toCancel} onClose={() => !cancelling && setToCancel(null)} title="Cancel this request?">
        <p className="text-sm text-slate-500 mb-4">
          {toCancel ? `Your ${KINDS[toCancel.kind].label.toLowerCase()} request (${toCancel.subtitle}) will be withdrawn.` : ''}
        </p>
        {cancelError && <p className="text-sm text-red-600 mb-3">{cancelError}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setToCancel(null)}
            disabled={cancelling}
            className={`h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 active:bg-slate-100 ${TAP}`}
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={confirmCancel}
            disabled={cancelling}
            className={`h-12 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-red-700 disabled:opacity-60 ${TAP}`}
          >
            {cancelling && <Loader2 size={16} className="animate-spin" />}
            Cancel request
          </button>
        </div>
      </BottomSheet>
    </PortalLayout>
  );
}