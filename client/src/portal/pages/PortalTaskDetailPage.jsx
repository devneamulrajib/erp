import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, CheckSquare, FileText, Loader2, Paperclip, Play,
  Plus, Send, Square, Timer, Trash2, X,
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { StatusBadge, ProgressBar, inputCls, TAP, fmtDay } from '../components/taskUi';
import {
  getMyTask, updateMyTask, addProgress, confirmAndStartTask, startTimer, stopTimer,
  addMySubtask, updateMySubtask, deleteMySubtask, getMyTaskMessages, sendMyTaskMessage,
  resolvePortalFileUrl, fmtMinutes, fmtSeconds, fmtClock, fmtTime,
} from '../api/portalTasks';

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done'];
const isImage = (mime = '') => mime.startsWith('image/');

export default function PortalTaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());

  const [subTitle, setSubTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgFiles, setMsgFiles] = useState([]);
  const [msgBusy, setMsgBusy] = useState(false);
  const fileRef = useRef(null);
  const chatEndRef = useRef(null);

  const load = useCallback(() => {
    getMyTask(id).then((t) => {
      setTask(t);
      setMessages(t.messages || []);
      setPercent(t.progress);
      setError('');
    }).catch((e) => setError(e.response?.data?.message || 'Could not load the task.'));
  }, [id]);

  const pollMessages = useCallback(() => {
    getMyTaskMessages(id).then(setMessages).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(pollMessages, 10000);
    return () => clearInterval(t);
  }, [pollMessages]);

  useEffect(() => {
    if (!task?.running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [task?.running]);

  async function act(fn, fallback) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(e.response?.data?.message || fallback); } finally { setBusy(false); }
  }

  async function handleAddSubtask(e) {
    e.preventDefault();
    if (!subTitle.trim()) return;
    await act(async () => {
      await addMySubtask(task.id, { title: subTitle.trim() });
      setSubTitle('');
    }, 'Could not add subtask.');
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!msgText.trim() && msgFiles.length === 0) return;
    setMsgBusy(true);
    setError('');
    try {
      const created = await sendMyTaskMessage(task.id, { message: msgText.trim(), files: msgFiles });
      setMessages((m) => [...m, created]);
      setMsgText('');
      setMsgFiles([]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send message.');
    } finally {
      setMsgBusy(false);
    }
  }

  if (!task) {
    return (
      <PortalLayout>
        {error ? <p className="text-sm text-red-600">{error}</p> : <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>}
      </PortalLayout>
    );
  }

  const closed = task.status === 'Done' || task.status === 'Cancelled';
  const unconfirmed = !task.confirmedAt && !closed;

  const activeSecs = task.running && task.runningSince ? Math.max(0, (now - new Date(task.runningSince).getTime()) / 1000) : 0;
  const liveWorkedSecs = (task.priorWorkedSeconds || 0) + activeSecs;
  const allottedSecs = task.estimatedMinutes ? task.estimatedMinutes * 60 : null;
  const crossed = allottedSecs !== null && liveWorkedSecs > allottedSecs;
  const diffSecs = allottedSecs !== null ? Math.abs(allottedSecs - liveWorkedSecs) : liveWorkedSecs;

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
          <p>Worked: <b className="text-slate-800 tabular-nums">{fmtClock(liveWorkedSecs)}</b></p>
          <p>Timer set: <b className="text-slate-800">{task.estimatedMinutes ? fmtMinutes(task.estimatedMinutes) : '—'}</b></p>
        </div>

        {allottedSecs !== null && (
          <div className={`mt-4 rounded-xl px-3.5 py-2.5 flex items-center justify-between ${
            crossed ? 'bg-red-50 text-red-700' : task.status === 'Done' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-800'
          }`}>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Timer size={15} />
              {crossed
                ? 'Time Crossed'
                : task.status === 'Done'
                  ? 'Time Saved'
                  : 'Time Remaining'}
            </span>
            <span className="text-base font-bold tabular-nums">
              {crossed
                ? `+${fmtClock(diffSecs)}`
                : task.status === 'Done'
                  ? fmtSeconds(task.savedSeconds ?? diffSecs)
                  : fmtClock(diffSecs)}
            </span>
          </div>
        )}

        {!closed && (
          unconfirmed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => confirmAndStartTask(task.id), 'Could not confirm and start timer.')}
              className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 text-white bg-emerald-600 disabled:opacity-60 ${TAP}`}
            >
              <CheckCircle2 size={16} /> Confirm & Start Timer
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => (task.running ? stopTimer(task.id) : startTimer(task.id)), 'Could not update the timer.')}
              className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 text-white disabled:opacity-60 ${TAP} ${task.running ? 'bg-red-500' : 'bg-slate-900'}`}
            >
              {task.running ? <><Square size={16} /> Stop timer</> : <><Play size={16} /> Resume timer</>}
            </button>
          )
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-900">
            Subtasks {task.subtasks?.length ? `(${task.subtasks.filter((s) => s.isCompleted).length}/${task.subtasks.length})` : ''}
          </p>
        </div>
        {!closed && (
          <form onSubmit={handleAddSubtask} className="flex gap-2 mb-3">
            <input
              className={inputCls}
              placeholder="Add a subtask…"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !subTitle.trim()}
              className={`shrink-0 flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold rounded-xl px-3.5 disabled:opacity-50 ${TAP}`}
            >
              <Plus size={14} /> Add
            </button>
          </form>
        )}
        {!task.subtasks?.length ? (
          <p className="text-xs text-slate-400">No subtasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {task.subtasks.map((st) => (
              <li key={st.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => updateMySubtask(task.id, st.id, { isCompleted: !st.isCompleted }), 'Could not update subtask.')}
                  className={`flex flex-1 items-start gap-2 text-left text-sm ${TAP}`}
                >
                  {st.isCompleted
                    ? <CheckSquare size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                    : <Square size={17} className="mt-0.5 shrink-0 text-slate-400" />}
                  <span className={st.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}>
                    {st.title}
                  </span>
                </button>
                {(st.createdByType === 'employee' || task.createdByType === 'employee') && !closed && (
                  <button
                    type="button"
                    onClick={() => window.confirm('Delete subtask?') && act(() => deleteMySubtask(task.id, st.id), 'Could not delete subtask.')}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Conversation & Files</p>
        <div className="max-h-72 overflow-y-auto space-y-2.5 mb-3">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400">No messages yet. Message admin or attach files below.</p>
          ) : messages.map((m) => {
            const isMe = m.senderType === 'employee';
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${isMe ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <div className={`flex items-center gap-1.5 text-[11px] mb-1 ${isMe ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span className="font-semibold">{m.senderName}</span>
                    <span>· {new Date(m.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}
                  {m.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.attachments.map((a) => {
                        const url = resolvePortalFileUrl(a.filePath);
                        return isImage(a.mimeType) ? (
                          <a key={a.id} href={url} target="_blank" rel="noreferrer" className="block">
                            <img src={url} alt={a.fileName} className="max-h-40 rounded-lg object-cover" />
                            <span className="block text-[11px] underline mt-0.5 opacity-80">{a.fileName}</span>
                          </a>
                        ) : (
                          <a
                            key={a.id}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs underline ${isMe ? 'bg-white/10 text-white' : 'bg-white text-slate-700'}`}
                          >
                            <FileText size={13} /> {a.fileName}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {msgFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {msgFiles.map((f, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {f.name}
                <button type="button" onClick={() => setMsgFiles((fs) => fs.filter((_, i) => i !== idx))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files || []);
              if (picked.length) setMsgFiles((prev) => [...prev, ...picked]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`border border-slate-200 rounded-xl p-2.5 text-slate-600 ${TAP}`}
          >
            <Paperclip size={16} />
          </button>
          <input
            className={inputCls}
            placeholder="Message admin…"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
          />
          <button
            type="submit"
            disabled={msgBusy || (!msgText.trim() && msgFiles.length === 0)}
            className={`bg-slate-900 text-white rounded-xl p-2.5 disabled:opacity-50 ${TAP}`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

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