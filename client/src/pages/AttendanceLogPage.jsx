import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Check, X, Loader2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getAttendanceLog } from '../api/employee';
import {
  getAttendanceCorrections,
  approveAttendanceCorrection,
  rejectAttendanceCorrection,
} from '../api/attendanceCorrection';

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

const STATUS_CLS = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const fmtDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export default function AttendanceLogPage() {
  const now = new Date();
  const [tab, setTab] = useState('log');

  /* ---------- Log tab ---------- */
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAttendanceLog({ year, month })
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Could not load the attendance log.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, reloadKey]);

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

  /* ---------- Corrections tab ---------- */
  const [corrections, setCorrections] = useState([]);
  const [corrLoading, setCorrLoading] = useState(true);
  const [corrError, setCorrError] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [actingId, setActingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');

  const loadCorrections = useCallback(async () => {
    setCorrError('');
    try {
      setCorrections(await getAttendanceCorrections());
    } catch {
      setCorrError('Could not load correction requests.');
    } finally {
      setCorrLoading(false);
    }
  }, []);

  useEffect(() => { loadCorrections(); }, [loadCorrections]);

  const pendingCount = corrections.filter((c) => c.status === 'Pending').length;
  const visibleCorrections = statusFilter === 'All' ? corrections : corrections.filter((c) => c.status === statusFilter);

  const approve = async (row) => {
    setActingId(row.id);
    setCorrError('');
    try {
      await approveAttendanceCorrection(row.id);
      await loadCorrections();
      setReloadKey((k) => k + 1); // the log changed: that day is now Present
    } catch (err) {
      setCorrError(errMsg(err, 'Could not approve this request.'));
    } finally {
      setActingId(null);
    }
  };

  const openReject = (row) => { setRejectTarget(row); setRejectNote(''); setRejectError(''); };

  const confirmReject = async () => {
    if (!rejectNote.trim()) { setRejectError('Please add a note so the employee knows why.'); return; }
    setActingId(rejectTarget.id);
    setRejectError('');
    try {
      await rejectAttendanceCorrection(rejectTarget.id, rejectNote.trim());
      setRejectTarget(null);
      await loadCorrections();
    } catch (err) {
      setRejectError(errMsg(err, 'Could not reject this request.'));
    } finally {
      setActingId(null);
    }
  };

  const tabCls = (active) =>
    `h-10 px-4 text-sm font-semibold rounded-lg transition-colors ${
      active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Attendance Log</h1>
        <p className="mb-5 text-sm text-slate-500">
          Monthly attendance of all employees, marked by employees or by admin.
        </p>

        {/* Tabs */}
        <div className="mb-4 inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setTab('log')} className={tabCls(tab === 'log')}>Log</button>
          <button type="button" onClick={() => setTab('corrections')} className={`${tabCls(tab === 'corrections')} flex items-center gap-2`}>
            Corrections
            {pendingCount > 0 && (
              <span className={`min-w-[20px] rounded-full px-1.5 text-[11px] font-bold leading-5 ${
                tab === 'corrections' ? 'bg-white text-slate-900' : 'bg-amber-400 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* ---------------- LOG TAB ---------------- */}
        {tab === 'log' && (
          <>
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
          </>
        )}

        {/* ---------------- CORRECTIONS TAB ---------------- */}
        {tab === 'corrections' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {corrError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{corrError}</div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">Requested</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {corrLoading && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
                  )}
                  {!corrLoading && visibleCorrections.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} requests.</td></tr>
                  )}
                  {visibleCorrections.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 align-top last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{c.employee?.name || `#${c.employeeId}`}</p>
                        <p className="text-[11px] text-slate-400">
                          {c.employee?.code}{c.employee?.department ? ` · ${c.employee.department}` : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{fmtDate(c.date)}</td>
                      <td className="max-w-[320px] px-4 py-3 text-slate-600">
                        <p>{c.reason}</p>
                        {c.adminNote && <p className="mt-1 text-xs text-slate-400">Note: {c.adminNote}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[c.status]}`}>
                          {c.status}
                        </span>
                        {c.reviewedBy && <p className="mt-1 text-[10px] text-slate-400">by {c.reviewedBy}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'Pending' ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              disabled={actingId === c.id}
                              onClick={() => approve(c)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actingId === c.id}
                              onClick={() => openReject(c)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-slate-900">Reject correction request</p>
            <p className="mb-3 mt-1 text-sm text-slate-500">
              {rejectTarget.employee?.name} · {fmtDate(rejectTarget.date)}
            </p>
            <textarea
              rows={3}
              autoFocus
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Tell the employee why (they will see this note)"
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-slate-400"
            />
            {rejectError && <p className="mt-2 text-sm text-red-600">{rejectError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={actingId === rejectTarget.id}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={actingId === rejectTarget.id}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actingId === rejectTarget.id && <Loader2 size={14} className="animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}