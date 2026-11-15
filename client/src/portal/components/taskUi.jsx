// Shared bits for portal task pages.
export const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

export const STATUS_STYLE = {
  'To Do': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'On Hold': 'bg-amber-50 text-amber-700',
  Done: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-600',
};
export const PRIORITY_STYLE = {
  Low: 'text-slate-400', Medium: 'text-slate-500', High: 'text-orange-600', Urgent: 'text-red-600',
};

export function StatusBadge({ status }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE['To Do']}`}>
      {status}
    </span>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full bg-slate-900 rounded-full" style={{ width: `${Math.min(100, value || 0)}%` }} />
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 bg-white';

export const fmtDay = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';