import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Square, Loader2, Clock, CalendarDays } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import BottomSheet from '../components/BottomSheet';
import { StatusBadge, ProgressBar, PRIORITY_STYLE, inputCls, TAP, fmtDay } from '../components/taskUi';
import { listMyTasks, createMyTask, startTimer, stopTimer, fmtMinutes } from '../api/portalTasks';

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

  const load = useCallback(() => {
    listMyTasks(tab).then((d) => { setTasks(d); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load tasks.'));
  }, [tab]);

  useEffect(() => { setTasks(null); load(); }, [load]);

  async function toggle(t) {
    setBusyId(t.id);
    setError('');
    try {
      if (t.running) await stopTimer(t.id); else await startTimer(t.id);
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
            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/portal/employee/tasks/${t.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <StatusBadge status={t.status} />
                      <span className={`text-[11px] font-semibold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                      {t.createdByType === 'admin' && <span className="text-[11px] text-slate-400">Assigned by {t.createdByName || 'admin'}</span>}
                    </div>
                  </Link>
                  {!closed && (
                    <button type="button" onClick={() => toggle(t)} disabled={busyId === t.id}
                      aria-label={t.running ? 'Stop timer' : 'Start timer'}
                      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 ${TAP} ${t.running ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                      {t.running ? <Square size={16} /> : <Play size={16} />}
                    </button>
                  )}
                </div>
                <div className="mt-3"><ProgressBar value={t.progress} /></div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{t.progress}%</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock size={12} />{fmtMinutes(t.workedMinutes)}{t.estimatedMinutes ? ` / ${fmtMinutes(t.estimatedMinutes)}` : ''}</span>
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
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', estimateHours: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createMyTask({
        title: form.title, description: form.description, priority: form.priority,
        dueDate: form.dueDate || null,
        estimatedMinutes: form.estimateHours ? Math.round(Number(form.estimateHours) * 60) : null,
      });
      setForm({ title: '', description: '', priority: 'Medium', dueDate: '', estimateHours: '' });
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
        <input type="number" min="0" step="0.25" className={inputCls} placeholder="Estimated hours (optional)" value={form.estimateHours} onChange={set('estimateHours')} />
        <button disabled={busy} className={`w-full bg-slate-900 text-white text-sm font-semibold rounded-xl py-3 disabled:opacity-60 ${TAP}`}>
          {busy ? 'Saving…' : 'Save task'}
        </button>
      </form>
    </BottomSheet>
  );
}