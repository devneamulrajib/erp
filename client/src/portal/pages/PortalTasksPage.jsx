import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Square, Loader2, Clock, CalendarDays, CheckCircle2, X } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import BottomSheet from '../components/BottomSheet';
import { StatusBadge, ProgressBar, PRIORITY_STYLE, inputCls, TAP, fmtDay } from '../components/taskUi';
import {
  listMyTasks, createMyTask, confirmAndStartTask, startTimer, stopTimer,
  fmtMinutes, fmtSeconds, fmtClock,
} from '../api/portalTasks';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'Done', label: 'Done' },
  { key: '', label: 'All' },
];
const today = () => new Date().toLocaleDateString('en-CA');

export default function PortalTasksPage() {
  const [tab, setTab] = useState('open');
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    listMyTasks(tab).then((d) => { setTasks(d); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load tasks.'));
  }, [tab]);

  useEffect(() => { setTasks(null); load(); }, [load]);

  useEffect(() => {
    if (!tasks?.some((t) => t.running)) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [tasks]);

  async function handleAction(t) {
    setBusyId(t.id);
    setError('');
    try {
      if (!t.confirmedAt) {
        await confirmAndStartTask(t.id);
      } else if (t.running) {
        await stopTimer(t.id);
      } else {
        await startTimer(t.id);
      }
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not update the timer.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
        <div className="flex items-center gap-2">
          <Link to="/portal/employee/work-log" className={`text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-2.5 ${TAP}`}>
            Work log
          </Link>
          <button type="button" onClick={() => setSheet(true)}
            className={`flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl px-3 py-2.5 ${TAP}`}>
            <Plus size={14} /> Add task
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold border ${TAP} ${tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      {tasks === null ? (
        <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No tasks here yet.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const closed = t.status === 'Done' || t.status === 'Cancelled';
            const overdue = t.dueDate && !closed && t.dueDate < today();
            const unconfirmed = !t.confirmedAt && !closed;

            const activeSecs = t.running && t.runningSince ? Math.max(0, (now - new Date(t.runningSince).getTime()) / 1000) : 0;
            const liveWorkedSecs = (t.priorWorkedSeconds || 0) + activeSecs;
            const allottedSecs = t.estimatedMinutes ? t.estimatedMinutes * 60 : null;
            const crossed = allottedSecs !== null && liveWorkedSecs > allottedSecs;
            const diffSecs = allottedSecs !== null ? Math.abs(allottedSecs - liveWorkedSecs) : liveWorkedSecs;

            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/portal/employee/tasks/${t.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <StatusBadge status={t.status} />
                      <span className={`text-[11px] font-semibold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                      {t.subtasksTotal > 0 && (
                        <span className="text-[11px] text-slate-500">{t.subtasksDone}/{t.subtasksTotal} subtasks</span>
                      )}
                      {t.createdByType === 'admin' && <span className="text-[11px] text-slate-400">Assigned by {t.createdByName || 'admin'}</span>}
                    </div>
                  </Link>
                  {!closed && (
                    unconfirmed ? (
                      <button
                        type="button"
                        onClick={() => handleAction(t)}
                        disabled={busyId === t.id}
                        className={`shrink-0 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl px-3 py-2.5 disabled:opacity-50 ${TAP}`}
                      >
                        <CheckCircle2 size={15} /> Confirm & Start
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAction(t)}
                        disabled={busyId === t.id}
                        aria-label={t.running ? 'Stop timer' : 'Start timer'}
                        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 ${TAP} ${t.running ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}
                      >
                        {t.running ? <Square size={16} /> : <Play size={16} />}
                      </button>
                    )
                  )}
                </div>

                {t.running && allottedSecs !== null && (
                  <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${crossed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    <Clock size={12} />
                    {crossed ? `Time crossed +${fmtClock(diffSecs)}` : `${fmtClock(diffSecs)} remaining`}
                  </div>
                )}

                {!t.running && t.overrunSeconds > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-red-600">Time crossed by {fmtSeconds(t.overrunSeconds)}</p>
                )}
                {t.status === 'Done' && t.savedSeconds > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-emerald-600">Time saved: {fmtSeconds(t.savedSeconds)}</p>
                )}

                <div className="mt-3"><ProgressBar value={t.progress} /></div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{t.progress}%</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {fmtMinutes(Math.round(liveWorkedSecs / 60))}
                      {t.estimatedMinutes ? ` / ${fmtMinutes(t.estimatedMinutes)}` : ''}
                    </span>
                    {t.dueDate && <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}><CalendarDays size={12} />{fmtDay(t.dueDate)}</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTaskSheet open={sheet} onClose={() => setSheet(false)} onSaved={() => { setSheet(false); load(); }} />
    </PortalLayout>
  );
}

function AddTaskSheet({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', timerHours: '', timerMinutes: '' });
  const [subtasks, setSubtasks] = useState([]);
  const [subInput, setSubInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function addSub() {
    const v = subInput.trim();
    if (!v) return;
    setSubtasks((s) => [...s, v]);
    setSubInput('');
  }

  async function submit(e) {
    e.preventDefault();
    const totalMinutes = (Number(form.timerHours || 0) * 60) + Number(form.timerMinutes || 0);
    if (!(totalMinutes > 0)) {
      setError('Please set a timer (hours or minutes greater than 0).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createMyTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate || null,
        estimatedMinutes: Math.round(totalMinutes),
        subtasks,
      });
      setForm({ title: '', description: '', priority: 'Medium', dueDate: '', timerHours: '', timerMinutes: '' });
      setSubtasks([]);
      setSubInput('');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add a task">
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input required className={inputCls} placeholder="What are you working on?" value={form.title} onChange={set('title')} />
        <textarea rows={3} className={inputCls} placeholder="Details (optional)" value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-2 gap-3">
          <select className={inputCls} value={form.priority} onChange={set('priority')}>
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
          </select>
          <input type="date" className={inputCls} value={form.dueDate} onChange={set('dueDate')} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1">Set Timer (required)</p>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" className={inputCls} placeholder="Hours (e.g. 1)" value={form.timerHours} onChange={set('timerHours')} />
            <input type="number" min="0" max="59" className={inputCls} placeholder="Minutes (e.g. 30)" value={form.timerMinutes} onChange={set('timerMinutes')} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1">Subtasks (optional)</p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Add a subtask…"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
            />
            <button type="button" onClick={addSub} className={`shrink-0 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 ${TAP}`}>
              Add
            </button>
          </div>
          {subtasks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {subtasks.map((st, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                  <span>{st}</span>
                  <button type="button" onClick={() => setSubtasks((s) => s.filter((_, idx) => idx !== i))} className="text-slate-400">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button disabled={busy} className={`w-full bg-slate-900 text-white text-sm font-semibold rounded-xl py-3 disabled:opacity-60 ${TAP}`}>
          {busy ? 'Saving…' : 'Save task'}
        </button>
      </form>
    </BottomSheet>
  );
}