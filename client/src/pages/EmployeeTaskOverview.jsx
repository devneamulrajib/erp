import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getTaskOverview, fmtMinutes, fmtTime } from '../api/task';

const ATT = {
  Present: 'bg-emerald-50 text-emerald-700',
  Absent: 'bg-red-50 text-red-600',
  Leave: 'bg-amber-50 text-amber-700',
  Holiday: 'bg-violet-50 text-violet-700',
};

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

export default function EmployeeTaskOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    getTaskOverview()
      .then((d) => { setData(d); setError(''); setUpdated(new Date()); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the overview.'));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // ERP admin has no socket, so poll
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Task Overview</h1>
            <p className="text-sm text-slate-500">
              What every employee is working on today. Refreshes every 30 seconds{updated ? ` · updated ${fmtTime(updated)}` : ''}.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/hrm-module/tasks" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">Assign task</Link>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {!data ? (
          <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Present today" value={data.totals.present} />
              <Stat label="Working now" value={data.totals.working} />
              <Stat label="Open tasks" value={data.totals.openTasks} />
              <Stat label="Overdue" value={data.totals.overdue} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Working on</th>
                    <th className="px-4 py-3 text-right">Worked</th>
                    <th className="px-4 py-3 text-right">Idle</th>
                    <th className="px-4 py-3 text-right">Open tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((e) => (
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
                          {e.currentTask ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                              <Link to={`/hrm-module/tasks/${e.currentTask.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">{e.currentTask.title}</Link>
                              <span className="text-xs text-slate-400">since {fmtTime(e.currentTask.since)}</span>
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{fmtMinutes(e.workedMinutes)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmtMinutes(e.idleMinutes)}</td>
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
                  ))}
                  {data.employees.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No active employees.</td></tr>
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