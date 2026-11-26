// client/src/components/workspace/workspaceKit.jsx
// Small UI pieces for the personal workspace in the Trikon demo style:
// white rounded cards, soft shadows, round coloured icons; ERP colours
// (black primary buttons like the top menu, DashboardKit accents).
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '../dashboard/DashboardKit';

export const TONES = {
  green: { icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  red: { icon: 'bg-rose-100 text-rose-600', text: 'text-rose-600', pill: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  blue: { icon: 'bg-cobalt-100 text-cobalt', text: 'text-cobalt', pill: 'bg-cobalt-50 text-cobalt-700 ring-cobalt/20' },
  purple: { icon: 'bg-violet-100 text-violet-600', text: 'text-violet-600', pill: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  amber: { icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  slate: { icon: 'bg-slate-100 text-slate-600', text: 'text-slate-600', pill: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  cyan: { icon: 'bg-cyan-100 text-cyan-600', text: 'text-cyan-600', pill: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20' },
};

export const card = 'rounded-2xl border border-slate-200/70 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.05)]';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-xs transition hover:bg-gold-600 hover:shadow disabled:opacity-60';
export const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';
export const selectClass =
  'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cobalt-400 focus:ring-4 focus:ring-cobalt/10';

/** Page header: icon tile, title, subtitle, controls on the right. */
export function WorkspaceHeader({ icon: Icon, title, subtitle, children, tone = 'dark' }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3.5">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
            tone === 'dark' ? 'bg-navy text-gold shadow-[0_4px_12px_rgba(11,31,58,0.22)]' : TONES[tone]?.icon
          }`}
        >
          {Icon && <Icon className="size-6" />}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

/** White summary card with a round coloured icon and an optional change badge. */
export function SummaryCard({ label, value, hint, icon: Icon, tone = 'green', change, loading, to }) {
  const t = TONES[tone] || TONES.green;
  const up = typeof change === 'number' && change >= 0;
  const body = (
    <div className="flex items-start gap-3.5">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
        {Icon && <Icon className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-28" />
        ) : (
          <p className="mt-1 truncate text-[22px] font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
          {typeof change === 'number' && Number.isFinite(change) && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
          {hint && <span className="truncate text-slate-400">{hint}</span>}
        </div>
      </div>
    </div>
  );
  const cls = `${card} block p-4 transition hover:-translate-y-0.5 hover:shadow-lg`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Card with a title row (and optional right-side action). */
export function WCard({ title, subtitle, right, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`${card} overflow-hidden ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatusPill({ tone = 'green', children }) {
  const t = TONES[tone] || TONES.green;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${t.pill}`}>
      {children}
    </span>
  );
}

export function ViewAll({ to, children = 'View All' }) {
  return (
    <Link to={to} className="shrink-0 text-xs font-semibold text-slate-500 transition hover:text-slate-900">
      {children} →
    </Link>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2.5 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

// ---- data helpers ----
export const listOf = (d) => (Array.isArray(d) ? d : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.data) ? d.data : []);
export const totalOf = (d) => (typeof d?.total === 'number' ? d.total : listOf(d).length);

export const isoDate = (d) => {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
};

export const shortDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const pctChange = (now, before) => {
  const a = Number(now) || 0;
  const b = Number(before) || 0;
  if (!b) return a ? 100 : 0;
  return ((a - b) / Math.abs(b)) * 100;
};

// Date range presets -> { from, to, prevFrom, prevTo, label }.
export function rangeFor(key, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start;
  if (key === '30d') start = new Date(end.getTime() - 29 * 86400000);
  else if (key === 'quarter') start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
  else if (key === 'year') start = new Date(end.getFullYear(), 0, 1);
  else start = new Date(end.getFullYear(), end.getMonth(), 1); // month
  const days = Math.round((end - start) / 86400000) + 1;
  const prevTo = new Date(start.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);
  return { from: isoDate(start), to: isoDate(end), prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo) };
}

export const RANGE_OPTIONS = [
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];
