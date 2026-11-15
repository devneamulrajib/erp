import { useCallback, useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getWorkLogReport, exportWorkLog, fmtMinutes, fmtTime } from '../api/task';
import { getEmployees } from '../api/employee';

const today = () => new Date().toLocaleDateString('en-CA');
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');
const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900';

export default function WorkLogReportPage() {
  const [range, setRange] = useState({ from: daysAgo(6), to: today(), employeeId: '' });
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));
  const load = useCallback(() => {
    setData(null);
    getWorkLogReport(params).then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the report.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getEmployees().then(({ data: d }) => setEmployees(Array.isArray(d) ? d : d?.rows || d?.employees || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setRange((r) => ({ ...r, [k]: e.target.value }));
  const pct = (w, s) => (s ? `${Math.min(100, Math.round((w / s) * 100))}%` : '—');

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Work Log Report</h1>
        <p className="mb-5 text-sm text-slate-500">Hours worked per task, and idle time (time present but not logged on a task).</p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input type="date" className={inputCls} value={range.from} onChange={set('from')} />
          <input type="date" className={inputCls} value={range.to} onChange={set('to')} />
          <select className={inputCls} value={range.employeeId} onChange={set('employeeId')}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => exportWorkLog(params).catch(() => setError('Export failed.'))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Download size={15} /> Excel
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {!data ? (
          !error && <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[['Worked', fmtMinutes(data.summary.workedMinutes)], ['Idle', fmtMinutes(data.summary.idleMinutes)],
                ['Utilisation', pct(data.summary.workedMinutes, data.summary.workedMinutes + data.summary.idleMinutes)]].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{v}</p>
                </div>
              ))}
            </div>

            <h2 className="mb-2 text-sm font-semibold text-slate-900">Daily</h2>
            <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3">In / Out</th><th className="px-4 py-3 text-right">Worked</th><th className="px-4 py-3 text-right">Idle</th><th className="px-4 py-3 text-right">Manual</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.days.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-slate-400">No records in this range.</td></tr> :
                    data.days.map((d) => (
                      <tr key={`${d.employeeId}-${d.date}`}>
                        <td className="px-4 py-2.5">{d.date}</td>
                        <td className="px-4 py-2.5">{d.name}</td>
                        <td className="px-4 py-2.5">{d.status || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{d.checkInAt ? `${fmtTime(d.checkInAt)} – ${d.checkOutAt ? fmtTime(d.checkOutAt) : '…'}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{fmtMinutes(d.workedMinutes)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600" title={d.basis === 'default' ? 'No check-in time; assumes a standard workday' : ''}>
                          {fmtMinutes(d.idleMinutes)}{d.basis === 'default' && '*'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-600">{d.manualMinutes ? fmtMinutes(d.manualMinutes) : ''}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="-mt-4 mb-6 text-[11px] text-slate-400">* Idle assumes a standard workday because no check-in time was recorded (e.g. marked by admin).</p>

            <h2 className="mb-2 text-sm font-semibold text-slate-900">By task</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3 text-right">Estimate</th><th className="px-4 py-3 text-right">Worked</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tasks.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-400">No time logged.</td></tr> :
                    data.tasks.map((t) => (
                      <tr key={`${t.employeeId}-${t.taskId}`}>
                        <td className="px-4 py-2.5">{t.title}</td><td className="px-4 py-2.5">{t.name}</td>
                        <td className="px-4 py-2.5">{t.status}</td><td className="px-4 py-2.5">{t.progress}%</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{t.estimatedMinutes ? fmtMinutes(t.estimatedMinutes) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{fmtMinutes(t.workedMinutes)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}