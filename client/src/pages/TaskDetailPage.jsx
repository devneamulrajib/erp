import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getTask, updateTask, deleteTask, updateTimeLog, deleteTimeLog, fmtMinutes, fmtTime } from '../api/task';

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
const SRC = { timer: '', manual: 'manual', auto_stopped: 'auto-stopped' };
const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getTask(id).then((t) => { setTask(t); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the task.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, fallback) {
    try { await fn(); load(); } catch (e) { setError(e.response?.data?.message || fallback); }
  }

  async function editLog(l) {
    const start = window.prompt('Start (YYYY-MM-DDTHH:MM)', toLocalInput(l.startedAt));
    if (!start) return;
    const end = l.endedAt ? window.prompt('End (YYYY-MM-DDTHH:MM)', toLocalInput(l.endedAt)) : null;
    if (l.endedAt && !end) return;
    run(() => updateTimeLog(l.id, {
      startedAt: new Date(start).toISOString(), ...(end ? { endedAt: new Date(end).toISOString() } : {}),
    }), 'Could not edit the entry.');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/hrm-module/tasks" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={14} /> All tasks</Link>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {!task ? (
          !error && <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
                  <p className="text-sm text-slate-500">{task.assignee?.name} ({task.assignee?.code}) · {task.createdByType === 'admin' ? `assigned by ${task.createdByName || 'admin'}` : 'added by employee'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={task.status} onChange={(e) => run(() => updateTask(task.id, { status: e.target.value }), 'Could not change status.')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={async () => { if (window.confirm('Delete this task and all its time entries?')) { try { await deleteTask(task.id); navigate('/hrm-module/tasks'); } catch (e) { setError(e.response?.data?.message || 'Could not delete.'); } } }} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
              {task.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{task.description}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <p><span className="block text-xs text-slate-400">Priority</span>{task.priority}</p>
                <p><span className="block text-xs text-slate-400">Due</span>{task.dueDate || '—'}</p>
                <p><span className="block text-xs text-slate-400">Progress</span>{task.progress}%</p>
                <p><span className="block text-xs text-slate-400">Worked / Estimate</span>{fmtMinutes(task.workedMinutes)}{task.estimatedMinutes ? ` / ${fmtMinutes(task.estimatedMinutes)}` : ''}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Progress updates</h2>
                {task.progressUpdates.length === 0 ? <p className="text-xs text-slate-400">No updates yet.</p> : (
                  <ul className="space-y-2">
                    {task.progressUpdates.map((u) => (
                      <li key={u.id} className="flex justify-between gap-3 text-xs text-slate-600">
                        <span><b className="text-slate-900">{u.percent}%</b> {u.note}</span>
                        <span className="shrink-0 text-slate-400">{new Date(u.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Time entries</h2>
                {task.logs.length === 0 ? <p className="text-xs text-slate-400">No time recorded.</p> : (
                  <ul className="space-y-2">
                    {task.logs.map((l) => (
                      <li key={l.id} className="text-xs text-slate-600">
                        <div className="flex justify-between gap-3">
                          <span>
                            {new Date(l.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {fmtTime(l.startedAt)} – {l.endedAt ? fmtTime(l.endedAt) : 'running'}
                            {SRC[l.source] && <em className="ml-1 text-amber-600">({SRC[l.source]})</em>}
                          </span>
                          <b className="text-slate-900">{l.endedAt ? fmtMinutes(Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 60000)) : '…'}</b>
                        </div>
                        {l.note && <p className="text-[11px] text-slate-400">{l.note}</p>}
                        <div className="mt-0.5 flex gap-3">
                          <button onClick={() => editLog(l)} className="text-[11px] text-slate-500 hover:underline">Edit</button>
                          <button onClick={() => window.confirm('Delete this time entry?') && run(() => deleteTimeLog(l.id), 'Could not delete.')} className="text-[11px] text-red-500 hover:underline">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}