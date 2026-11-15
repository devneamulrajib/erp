import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import BottomSheet from '../components/BottomSheet';
import { inputCls, TAP } from '../components/taskUi';
import { getWorkLog, listMyTasks, addManualTime, fmtMinutes, fmtTime } from '../api/portalTasks';

const today = () => new Date().toLocaleDateString('en-CA');

function Stat({ label, value, note }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}

export default function PortalWorkLogPage() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);

  const load = useCallback(() => {
    getWorkLog(date).then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the work log.'));
  }, [date]);
  useEffect(() => { setData(null); load(); }, [load]);

  return (
    <PortalLayout>
      <Link to="/portal/employee/tasks" className={`inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3 py-1 ${TAP}`}>
        <ArrowLeft size={14} /> Tasks
      </Link>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-slate-900">Work Log</h1>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputCls} !w-auto`} />
      </div>
      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
      {!data ? (
        <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <Stat label="Worked" value={fmtMinutes(data.workedMinutes)} />
            <Stat label="Idle" value={fmtMinutes(data.idleMinutes)}
              note={data.basis === 'default' ? 'assumes a standard day' : data.basis === 'none' ? 'not present' : ''} />
            <Stat label="In / Out" value={`${fmtTime(data.checkInAt)}`} note={data.checkOutAt ? `out ${fmtTime(data.checkOutAt)}` : ''} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-900">Entries</p>
            <button type="button" onClick={() => setSheet(true)} className={`flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 py-2 ${TAP}`}>
              <Plus size={14} /> Add missed time
            </button>
          </div>
          {data.logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No time recorded on this day.</p>
          ) : (
            <div className="space-y-2">
              {data.logs.map((l) => (
                <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{l.taskTitle}</p>
                    <p className="text-xs text-slate-500">
                      {fmtTime(l.startedAt)} – {l.endedAt ? fmtTime(l.endedAt) : 'running'}
                      {l.source !== 'timer' && <em className="ml-1 text-amber-600">({l.source === 'manual' ? 'manual' : 'auto-stopped'})</em>}
                    </p>
                    {l.note && <p className="text-[11px] text-slate-400 mt-0.5">{l.note}</p>}
                  </div>
                  <b className="text-sm text-slate-800 shrink-0">{l.endedAt ? fmtMinutes(Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 60000)) : '…'}</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <ManualSheet open={sheet} date={date} onClose={() => setSheet(false)} onSaved={() => { setSheet(false); load(); }} />
    </PortalLayout>
  );
}

function ManualSheet({ open, date, onClose, onSaved }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ taskId: '', start: '09:00', end: '10:00', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { if (open) listMyTasks('').then(setTasks).catch(() => {}); }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Browser-local time -> ISO. The server enforces the 2-day window.
      await addManualTime({
        taskId: Number(form.taskId),
        startedAt: new Date(`${date}T${form.start}:00`).toISOString(),
        endedAt: new Date(`${date}T${form.end}:00`).toISOString(),
        note: form.note,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the entry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add missed time">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-slate-500">For {date}. Manual entries are marked and limited to the last 2 days.</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <select required className={inputCls} value={form.taskId} onChange={set('taskId')}>
          <option value="">Select task…</option>
          {tasks.filter((t) => !['Done', 'Cancelled'].includes(t.status)).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="time" required className={inputCls} value={form.start} onChange={set('start')} />
          <input type="time" required className={inputCls} value={form.end} onChange={set('end')} />
        </div>
        <input required className={inputCls} placeholder="Reason (e.g. forgot to start timer)" value={form.note} onChange={set('note')} />
        <button disabled={busy} className={`w-full bg-slate-900 text-white text-sm font-semibold rounded-xl py-3 disabled:opacity-60 ${TAP}`}>
          {busy ? 'Saving…' : 'Save entry'}
        </button>
      </form>
    </BottomSheet>
  );
}