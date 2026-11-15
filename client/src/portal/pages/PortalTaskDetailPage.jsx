import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Square, Loader2 } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { StatusBadge, ProgressBar, inputCls, TAP, fmtDay } from '../components/taskUi';
import {
  getMyTask, updateMyTask, addProgress, startTimer, stopTimer, fmtMinutes, fmtTime,
} from '../api/portalTasks';

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done'];

export default function PortalTaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    getMyTask(id).then((t) => { setTask(t); setPercent(t.progress); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the task.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn, fallback) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(e.response?.data?.message || fallback); } finally { setBusy(false); }
  }

  if (!task) {
    return (
      <PortalLayout>
        {error ? <p className="text-sm text-red-600">{error}</p> : <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>}
      </PortalLayout>
    );
  }
  const closed = task.status === 'Done' || task.status === 'Cancelled';

  return (
    <PortalLayout>
      <Link to="/portal/employee/tasks" className={`inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3 py-1 ${TAP}`}>
        <ArrowLeft size={14} /> Tasks
      </Link>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-900">{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>
        {task.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{task.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 mt-4">
          <p>Priority: <b className="text-slate-800">{task.priority}</b></p>
          <p>Due: <b className="text-slate-800">{task.dueDate ? fmtDay(task.dueDate) : '—'}</b></p>
          <p>Project: <b className="text-slate-800">{task.project?.name || '—'}</b></p>
          <p>From: <b className="text-slate-800">{task.createdByType === 'admin' ? task.createdByName || 'Admin' : 'Me'}</b></p>
          <p>Worked: <b className="text-slate-800">{fmtMinutes(task.workedMinutes)}</b></p>
          <p>Estimate: <b className="text-slate-800">{task.estimatedMinutes ? fmtMinutes(task.estimatedMinutes) : '—'}</b></p>
        </div>
        {!closed && (
          <button type="button" disabled={busy}
            onClick={() => act(() => (task.running ? stopTimer(task.id) : startTimer(task.id)), 'Could not update the timer.')}
            className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 text-white disabled:opacity-60 ${TAP} ${task.running ? 'bg-red-500' : 'bg-slate-900'}`}>
            {task.running ? <><Square size={16} /> Stop timer</> : <><Play size={16} /> Start timer</>}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      {!closed && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Update progress</p>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="100" step="5" value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="flex-1" />
            <span className="w-10 text-right text-sm font-bold">{percent}%</span>
          </div>
          <input className={inputCls} placeholder="What did you do? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" disabled={busy}
              onClick={() => act(async () => { await addProgress(task.id, { percent, note }); setNote(''); }, 'Could not save progress.')}
              className={`flex-1 bg-slate-900 text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-60 ${TAP}`}>
              Save progress
            </button>
            <select className={`${inputCls} !w-auto`} value={task.status} disabled={busy}
              onChange={(e) => act(() => updateMyTask(task.id, { status: e.target.value }), 'Could not change status.')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <p className="text-sm font-semibold text-slate-900 mb-2">Progress history</p>
        <ProgressBar value={task.progress} />
        {task.progressUpdates.length === 0 ? <p className="text-xs text-slate-400 mt-3">No updates yet.</p> : (
          <ul className="mt-3 space-y-2">
            {task.progressUpdates.map((u) => (
              <li key={u.id} className="text-xs text-slate-600 flex justify-between gap-3">
                <span><b className="text-slate-800">{u.percent}%</b> {u.note}</span>
                <span className="text-slate-400 shrink-0">{new Date(u.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-slate-900 mb-2">Time entries</p>
        {task.logs.length === 0 ? <p className="text-xs text-slate-400">No time recorded yet.</p> : (
          <ul className="space-y-2">
            {task.logs.map((l) => (
              <li key={l.id} className="text-xs text-slate-600 flex justify-between gap-3">
                <span>
                  {new Date(l.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {fmtTime(l.startedAt)} – {l.endedAt ? fmtTime(l.endedAt) : 'running'}
                  {l.source !== 'timer' && <em className="ml-1 text-amber-600">({l.source === 'manual' ? 'manual' : 'auto-stopped'})</em>}
                </span>
                <b className="text-slate-800">{l.endedAt ? fmtMinutes(Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 60000)) : '…'}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalLayout>
  );
}