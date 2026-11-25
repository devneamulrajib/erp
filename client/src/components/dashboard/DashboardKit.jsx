// client/src/components/dashboard/DashboardKit.jsx
// Shared building blocks for the staff dashboards (hero header, KPI cards,
// quick links, skeletons, empty and error states). Tailwind only, no new deps.
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { canOpenLink, readStoredUser } from '../../config/permissions';

// Hero gradients per module, all built on the app's palette.
const HERO_TONES = {
  emerald: 'from-[#0c2a1e] via-[#174d36] to-[#2a9d8f]',
  indigo: 'from-[#1e1b4b] via-[#3730a3] to-[#6366f1]',
  blue: 'from-[#0b1f44] via-[#1d4ed8] to-[#0ea5e9]',
  violet: 'from-[#2e1065] via-[#6d28d9] to-[#a855f7]',
  slate: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
};

// Icon bubble and accent colours for KPI cards.
const ACCENTS = {
  emerald: { icon: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', ring: 'hover:border-emerald-300' },
  teal: { icon: 'bg-teal-100 text-teal-700', bar: 'bg-teal-500', ring: 'hover:border-teal-300' },
  blue: { icon: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', ring: 'hover:border-blue-300' },
  indigo: { icon: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-500', ring: 'hover:border-indigo-300' },
  violet: { icon: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500', ring: 'hover:border-violet-300' },
  amber: { icon: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', ring: 'hover:border-amber-300' },
  rose: { icon: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500', ring: 'hover:border-rose-300' },
  sky: { icon: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500', ring: 'hover:border-sky-300' },
  slate: { icon: 'bg-slate-100 text-slate-700', bar: 'bg-slate-500', ring: 'hover:border-slate-300' },
};

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

/**
 * Gradient hero header. `stats` is an optional list of { label, value }
 * chips shown on the right (desktop) or under the title (mobile).
 */
export function DashboardHero({
  tone = 'emerald',
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  actions,
  stats = [],
  children,
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${HERO_TONES[tone] || HERO_TONES.emerald} p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7`}
    >
      {/* soft decorative glows */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {Icon && <Icon className="size-3.5" />}
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-white/75">{subtitle}</p>}
          {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap lg:justify-end">
            {stats.map((s) => (
              <div
                key={s.label}
                className="min-w-[120px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/65">{s.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}

/** Button styles for use inside DashboardHero `actions`. */
export const heroButton =
  'inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60';
export const heroButtonSolid =
  'inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-lg shadow-black/10 transition hover:bg-slate-100';

/** KPI card. Renders as a Link when `to` is given. */
export function KpiCard({ label, value, icon: Icon, accent = 'emerald', hint, to: target, loading, error }) {
  const a = ACCENTS[accent] || ACCENTS.emerald;
  // Only link to pages this user may open.
  const to = target && canOpenLink(readStoredUser(), target) ? target : null;
  const body = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${a.bar} opacity-80`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : error ? (
        <p className="mt-3 text-xs font-medium text-rose-500">Unavailable</p>
      ) : (
        <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>
      )}
      <div className="mt-1 flex items-center justify-between gap-2">
        {hint ? <p className="truncate text-[11px] text-slate-400">{hint}</p> : <span />}
        {to && <ArrowUpRight className="size-3.5 shrink-0 text-slate-300 transition group-hover:text-slate-600" />}
      </div>
    </>
  );
  const cls = `group relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,.05)] transition hover:-translate-y-0.5 hover:shadow-lg ${a.ring}`;
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Panel with an icon title row. */
export function Panel({ icon: Icon, title, subtitle, right, accent = 'emerald', children, className = '', bodyClassName = 'p-4' }) {
  const a = ACCENTS[accent] || ACCENTS.emerald;
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,.05)] ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
                <Icon className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="truncate text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Grid of quick links to existing routes: items = [{ label, to, icon, accent }]. */
export function QuickLinks({ items }) {
  // Hide shortcuts to pages this user may not open.
  const user = readStoredUser();
  const visible = items.filter((i) => canOpenLink(user, i.to));
  if (!visible.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {visible.map(({ label, to, icon: Icon, accent = 'emerald' }) => {
        const a = ACCENTS[accent] || ACCENTS.emerald;
        return (
          <Link
            key={to + label}
            to={to}
            className={`group flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${a.ring}`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
              <Icon className="size-4" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-8 text-center">
      {Icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="size-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>}
    </div>
  );
}

export function ErrorState({ title = 'Unable to load this section', message, onRetry }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <AlertCircle className="size-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs text-slate-400">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="size-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

/** Thin progress bar, value 0-100. */
export function ProgressBar({ value = 0, accent = 'emerald', className = '' }) {
  const a = ACCENTS[accent] || ACCENTS.emerald;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full ${a.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}
