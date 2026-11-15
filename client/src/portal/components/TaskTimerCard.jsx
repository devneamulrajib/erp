import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Square, Timer, ListChecks } from 'lucide-react';
import { getRunning, stopTimer, fmtClock } from '../api/portalTasks';

const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

// Live "currently working on" card. Server timestamps are the source of truth;
// the ticking clock is just now - startedAt.
export default function TaskTimerCard() {
  const [running, setRunning] = useState(undefined); // undefined = loading, null = none
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getRunning().then(setRunning).catch(() => setRunning(null));
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (!running) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);

  async function handleStop() {
    setBusy(true);
    setError('');
    try {
      await stopTimer(running.taskId);
      setRunning(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not stop the timer.');
    } finally {
      setBusy(false);
    }
  }

  if (running === undefined) return null;

  if (!running) {
    return (
      <Link
        to="/portal/employee/tasks"
        className={`flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50 ${TAP}`}
      >
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
          <ListChecks size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">No task timer running</p>
          <p className="text-xs text-slate-500">Open your tasks to start working</p>
        </div>
      </Link>
    );
  }

  const secs = (now - new Date(running.startedAt).getTime()) / 1000;
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 mb-1">
        <Timer size={14} /> Working now
      </div>
      <Link to={`/portal/employee/tasks/${running.taskId}`} className="block text-sm font-semibold truncate">
        {running.task?.title}
      </Link>
      <div className="flex items-center justify-between mt-3">
        <span className="text-3xl font-bold tabular-nums">{fmtClock(secs)}</span>
        <button
          type="button"
          onClick={handleStop}
          disabled={busy}
          className={`flex items-center gap-1.5 bg-white text-slate-900 text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-60 ${TAP}`}
        >
          <Square size={14} /> {busy ? 'Stopping…' : 'Stop'}
        </button>
      </div>
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  );
}