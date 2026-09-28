import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getAttendanceLog } from '../api/employee';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CELL = {
  Present: { letter: 'P', cls: 'bg-emerald-50 text-emerald-700' },
  Absent: { letter: 'A', cls: 'bg-red-50 text-red-600' },
  Leave: { letter: 'L', cls: 'bg-amber-50 text-amber-700' },
  Holiday: { letter: 'H', cls: 'bg-violet-50 text-violet-700' },
  Off: { letter: 'O', cls: 'bg-slate-100 text-slate-400' },
  Pending: { letter: '·', cls: 'text-slate-400' },
};

export default function AttendanceLogPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAttendanceLog({ year, month })
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Could not load the attendance log.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month]);

  const departments = useMemo(
    () => [...new Set((data?.rows || []).map((r) => r.department).filter(Boolean))].sort(),
    [data]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || []).filter(
      (r) =>
        (!dept || r.department === dept) &&
        (!q || r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q))
    );
  }, [data, search, dept]);

  const dayHeads = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: data.daysInMonth }, (_, i) => ({
      day: i + 1,
      wd: WD[new Date(year, month - 1, i + 1).getDay()],
      off: data.weeklyOffDays.includes(new Date(year, month - 1, i + 1).getDay()),
    }));
  }, [data, year, month]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const inputCls =
    'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400';

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Attendance Log</h1>
        <p className="mb-5 text-sm text-slate-500">
          Monthly attendance of all employees, marked by employees or by admin.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className={`${inputCls} w-64 pl-9`}
            />
          </div>
          <select className={inputCls} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="sticky left-0 z-10 min-w-[200px] bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                  Employee
                </th>
                {dayHeads.map((d) => (
                  <th key={d.day} className={`min-w-[28px] px-0.5 py-2 text-center font-medium ${d.off ? 'bg-slate-50' : ''}`}>
                    <div className="text-[9px]">{d.wd}</div>
                    <div className="text-[11px] text-slate-600">{d.day}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase text-emerald-600">P</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase text-red-500">A</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase text-amber-600">L</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr><td colSpan={40} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              )}
              {data && rows.length === 0 && (
                <tr><td colSpan={40} className="px-4 py-8 text-center text-slate-500">No employees found.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.code}{r.department ? ` · ${r.department}` : ''}</p>
                  </td>
                  {r.days.map((s, i) => {
                    const c = s && CELL[s];
                    return (
                      <td key={i} className="px-0.5 py-1.5 text-center" title={s ? `${i + 1}: ${s}` : ''}>
                        {c ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-semibold ${c.cls}`}>
                            {c.letter}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-3 text-center font-bold text-emerald-600">{r.counts.present}</td>
                  <td className="px-3 text-center font-bold text-red-500">{r.counts.absent}</td>
                  <td className="px-3 text-center font-bold text-amber-600">{r.counts.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span><b className="text-emerald-600">P</b> Present</span>
          <span><b className="text-red-500">A</b> Absent</span>
          <span><b className="text-amber-600">L</b> Leave</span>
          <span><b className="text-violet-600">H</b> Holiday</span>
          <span><b className="text-slate-400">O</b> Weekly off</span>
          <span><b>·</b> Today, not marked yet</span>
        </div>
      </main>
    </div>
  );
}