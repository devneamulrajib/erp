import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Timer, Activity, UserCheck, ListTodo, AlarmClock, Plus } from 'lucide-react';
import { DashboardHero, KpiCard, Panel, Skeleton, ErrorState, heroButton, heroButtonSolid } from '../components/dashboard/DashboardKit';
import Topbar from '../components/Topbar';
import { getTaskOverview, fmtMinutes, fmtClock, fmtTime } from '../api/task';

const ATT = {
  Present: 'bg-emerald-50 text-emerald-700',
  Absent: 'bg-red-50 text-red-600',
  Leave: 'bg-amber-50 text-amber-700',
  Holiday: 'bg-violet-50 text-violet-700',
};


export default function EmployeeTaskOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    getTaskOverview()
      .then((d) => { setData(d); setError(''); setUpdated(new Date()); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the overview.'));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <DashboardHero
            tone="violet"
            icon={Activity}
            eyebrow="HRM · Live"
            title="Live Task Overview"
            subtitle={`Employees currently working on a task. Refreshes every 30 seconds${updated ? ` · updated ${fmtTime(updated)}` : ''}.`}
            actions={
              <>
                <button onClick={load} className={heroButton}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <Link to="/hrm-module/tasks" className={heroButtonSolid}>
                  <Plus size={14} /> Assign task
                </Link>
              </>
            }
          />
        </div>

        {error && data && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {!data && error ? (
          <Panel><ErrorState title="Could not load the overview" message={error} onRetry={load} /></Panel>
        ) : !data ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard label="Working now" icon={Timer} accent="emerald" value={data.totals.working ?? 0} />
              <KpiCard label="Present today" icon={UserCheck} accent="sky" value={data.totals.present ?? 0} to="/hrm-module/attendance-log" />
              <KpiCard label="Open tasks" icon={ListTodo} accent="violet" value={data.totals.openTasks ?? 0} to="/hrm-module/tasks" />
              <KpiCard label="Overdue" icon={AlarmClock} accent="rose" value={data.totals.overdue ?? 0} to="/hrm-module/tasks" />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Active task</th>
                    <th className="px-4 py-3">Live timer</th>
                    <th className="px-4 py-3 text-right">Today worked</th>
                    <th className="px-4 py-3 text-right">Open tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((e) => {
                    const ct = e.currentTask;
                    const sessionSecs = ct ? Math.max(0, (now - new Date(ct.since).getTime()) / 1000) : 0;
                    const totalTaskSecs = (ct?.priorWorkedSeconds || 0) + sessionSecs;
                    const allottedSecs = ct?.estimatedMinutes ? ct.estimatedMinutes * 60 : null;
                    const crossed = allottedSecs !== null && totalTaskSecs > allottedSecs;
                    const diffSecs = allottedSecs !== null ? Math.abs(allottedSecs - totalTaskSecs) : totalTaskSecs;

                    return (
                      <Fragment key={e.id}>
                        <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === e.id ? null : e.id)}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{e.name}</p>
                            <p className="text-xs text-slate-400">{e.code}{e.designation ? ` · ${e.designation}` : ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ATT[e.attendance] || 'bg-slate-100 text-slate-500'}`}>{e.attendance || 'Not marked'}</span>
                            {e.checkInAt && <p className="mt-0.5 text-[11px] text-slate-400">{fmtTime(e.checkInAt)}{e.checkOutAt ? ` – ${fmtTime(e.checkOutAt)}` : ''}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-emerald-700">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                              <Link to={`/hrm-module/tasks/${ct.id}`} onClick={(ev) => ev.stopPropagation()} className="font-medium hover:underline">
                                {ct.title}
                              </Link>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">
                              started {fmtTime(ct.since)} · {ct.progress}%
                              {ct.subtasksTotal > 0 ? ` · ${ct.subtasksDone}/${ct.subtasksTotal} subtasks` : ''}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${crossed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              <Timer size={13} />
                              {allottedSecs !== null
                                ? (crossed ? `+${fmtClock(diffSecs)} crossed` : `${fmtClock(diffSecs)} left`)
                                : fmtClock(totalTaskSecs)}
                            </div>
                            {ct.estimatedMinutes && (
                              <p className="mt-0.5 text-[11px] text-slate-400">of {fmtMinutes(ct.estimatedMinutes)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{fmtMinutes(e.workedMinutes)}</td>
                          <td className="px-4 py-3 text-right">
                            {e.openTasks}{e.overdueTasks > 0 && <span className="ml-1 text-xs font-semibold text-red-600">({e.overdueTasks} overdue)</span>}
                          </td>
                        </tr>
                        {open === e.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={6} className="px-4 py-3">
                              {e.tasks.length === 0 ? <p className="text-xs text-slate-400">No open tasks.</p> : (
                                <ul className="space-y-1.5">
                                  {e.tasks.map((t) => (
                                    <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
                                      <Link to={`/hrm-module/tasks/${t.id}`} className="text-slate-700 hover:underline">{t.title}</Link>
                                      <span className="text-slate-500">{t.status} · {t.progress}%{t.dueDate ? ` · due ${t.dueDate}` : ''}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {data.employees.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No employees are currently working on a task.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}