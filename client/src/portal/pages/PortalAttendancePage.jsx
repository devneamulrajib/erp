import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarX, CalendarDays } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import CheckInCard from '../components/CheckInCard';
import { getAttendanceSummary } from '../api/portalEmployee';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);

const CELL_STYLES = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Absent: 'bg-red-50 text-red-600 border-red-200',
  Leave: 'bg-amber-50 text-amber-700 border-amber-200',
  Holiday: 'bg-violet-50 text-violet-700 border-violet-200',
  Off: 'bg-slate-100 text-slate-400 border-slate-100',
  Pending: 'bg-white text-slate-500 border-slate-300 border-dashed',
};

const LEGEND = [
  ['Present', 'bg-emerald-400'],
  ['Absent', 'bg-red-400'],
  ['Leave', 'bg-amber-400'],
  ['Holiday', 'bg-violet-400'],
  ['Weekly off', 'bg-slate-300'],
];

function Stat({ label, value, icon, tone }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={tone}>{icon}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}

export default function PortalAttendancePage() {
  const now = new Date();
  const [view, setView] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = view === 'month' ? { view, year, month } : { view, year };
    getAttendanceSummary(params)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Could not load attendance right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view, year, month, tick]);

  const byDate = useMemo(
    () => Object.fromEntries((data?.days || []).map((d) => [d.date, d.status])),
    [data]
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const ready = data && data.view === view;
  const counts = ready ? data.counts : null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const selectCls =
    'border border-slate-200 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400';

  return (
    <PortalLayout>
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-1">Attendance</h1>
      <p className="text-sm text-slate-400 mb-5">Mark your attendance and review your record.</p>

      <CheckInCard onChange={() => setTick((t) => t + 1)} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {[['month', 'Monthly'], ['year', 'Yearly']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === 'month' && (
          <select className={selectCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        )}
        <select className={selectCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-5">
        <Stat label="Present" value={counts ? counts.present : '–'} icon={<CalendarCheck size={14} />} tone="text-emerald-500" />
        <Stat label="Absent" value={counts ? counts.absent : '–'} icon={<CalendarX size={14} />} tone="text-red-400" />
        <Stat label="Leave" value={counts ? counts.leave : '–'} icon={<CalendarDays size={14} />} tone="text-amber-500" />
      </div>

      {loading && !ready && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading…</div>
      )}

      {/* Monthly calendar */}
      {ready && view === 'month' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-5">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDow }, (_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = byDate[date];
              const isToday = data.today === date;
              return (
                <div
                  key={date}
                  title={status || ''}
                  className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-semibold ${
                    status ? CELL_STYLES[status] : 'border-transparent text-slate-300'
                  } ${isToday ? 'ring-2 ring-slate-900' : ''}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] text-slate-500">
            {LEGEND.map(([label, dot]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} /> {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Yearly table */}
      {ready && view === 'year' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Month</th>
                <th className="px-4 py-3 font-semibold text-right">Present</th>
                <th className="px-4 py-3 font-semibold text-right">Absent</th>
                <th className="px-4 py-3 font-semibold text-right">Leave</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{MONTHS[m.month - 1]}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{m.present || '–'}</td>
                  <td className="px-4 py-2.5 text-right text-red-500 font-semibold">{m.absent || '–'}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600 font-semibold">{m.leave || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  );
}