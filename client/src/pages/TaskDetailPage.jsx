import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckSquare, FileText, Loader2, Paperclip, Plus, Send, Square, Trash2, X,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import {
  getTask, updateTask, deleteTask, updateTimeLog, deleteTimeLog,
  addSubtask, updateSubtask, deleteSubtask, getTaskMessages, sendTaskMessage,
  resolveFileUrl, fmtMinutes, fmtSeconds, fmtClock, fmtTime,
} from '../api/task';

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
const SRC = { timer: '', manual: 'manual', auto_stopped: 'auto-stopped' };
const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const isImage = (mime = '') => mime.startsWith('image/');

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const [subTitle, setSubTitle] = useState('');
  const [subBusy, setSubBusy] = useState(false);

  const [msgText, setMsgText] = useState('');
  const [msgFiles, setMsgFiles] = useState([]);
  const [msgBusy, setMsgBusy] = useState(false);
  const fileRef = useRef(null);
  const chatEndRef = useRef(null);

  const load = useCallback(() => {
    getTask(id)
      .then((t) => {
        setTask(t);
        setMessages(t.messages || []);
        setError('');
      })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the task.'));
  }, [id]);

  const pollMessages = useCallback(() => {
    getTaskMessages(id).then(setMessages).catch(() => {});
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

  async function handleAddSubtask(e) {
    e.preventDefault();
    if (!subTitle.trim()) return;
    setSubBusy(true);
    try {
      await addSubtask(task.id, { title: subTitle.trim() });
      setSubTitle('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add subtask.');
    } finally {
      setSubBusy(false);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!msgText.trim() && msgFiles.length === 0) return;
    setMsgBusy(true);
    try {
      const created = await sendTaskMessage(task.id, { message: msgText.trim(), files: msgFiles });
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

  let liveWorkedSeconds = task?.workedSeconds || 0;
  if (task?.running && task?.runningSince) {
    const prior = (task.logs || [])
      .filter((l) => l.endedAt)
      .reduce((s, l) => s + Math.max(0, Math.round((new Date(l.endedAt) - new Date(l.startedAt)) / 1000)), 0);
    liveWorkedSeconds = prior + Math.max(0, Math.round((now - new Date(task.runningSince).getTime()) / 1000));
  }
  const allottedSeconds = task?.estimatedMinutes ? task.estimatedMinutes * 60 : null;
  const liveOverrun = allottedSeconds !== null && liveWorkedSeconds > allottedSeconds ? liveWorkedSeconds - allottedSeconds : 0;
  const liveRemaining = allottedSeconds !== null && liveWorkedSeconds <= allottedSeconds ? allottedSeconds - liveWorkedSeconds : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link to="/hrm-module/tasks" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={14} /> All tasks
        </Link>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {!task ? (
          !error && <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
                    {!task.confirmedAt && !['Done', 'Cancelled'].includes(task.status) && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Waiting employee confirmation
                      </span>
                    )}
                    {task.running && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Timer running
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {task.assignee?.name} ({task.assignee?.code}) · {task.createdByType === 'admin' ? `assigned by ${task.createdByName || 'admin'}` : 'added by employee'}
                    {task.confirmedAt ? ` · confirmed ${new Date(task.confirmedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={task.status} onChange={(e) => run(() => updateTask(task.id, { status: e.target.value }), 'Could not change status.')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={async () => { if (window.confirm('Delete this task and all its data?')) { try { await deleteTask(task.id); navigate('/hrm-module/tasks'); } catch (e) { setError(e.response?.data?.message || 'Could not delete.'); } } }} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
              {task.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{task.description}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <p><span className="block text-xs text-slate-400">Priority</span>{task.priority}</p>
                <p><span className="block text-xs text-slate-400">Due</span>{task.dueDate || '—'}</p>
                <p><span className="block text-xs text-slate-400">Progress</span>{task.progress}%</p>
                <p>
                  <span className="block text-xs text-slate-400">Worked / Timer</span>
                  <span className="tabular-nums font-medium">{fmtClock(liveWorkedSeconds)}</span>
                  {task.estimatedMinutes ? <span className="text-slate-400"> / {fmtMinutes(task.estimatedMinutes)}</span> : ''}
                </p>
                <div>
                  <span className="block text-xs text-slate-400">Timer Status</span>
                  {allottedSeconds === null ? (
                    <span>No timer set</span>
                  ) : liveOverrun > 0 ? (
                    <span className="font-semibold text-red-600">Crossed +{fmtSeconds(liveOverrun)}</span>
                  ) : task.status === 'Done' ? (
                    <span className="font-semibold text-emerald-600">Saved {fmtSeconds(task.savedSeconds ?? liveRemaining)}</span>
                  ) : (
                    <span className="font-medium text-slate-800 tabular-nums">{fmtClock(liveRemaining)} left</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Subtasks {task.subtasks?.length ? `(${task.subtasks.filter((s) => s.isCompleted).length}/${task.subtasks.length})` : ''}
                  </h2>
                </div>
                <form onSubmit={handleAddSubtask} className="mb-3 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
                    placeholder="Add a subtask…"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={subBusy || !subTitle.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    <Plus size={14} /> Add
                  </button>
                </form>
                {!task.subtasks?.length ? (
                  <p className="text-xs text-slate-400">No subtasks yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {task.subtasks.map((st) => (
                      <li key={st.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => run(() => updateSubtask(task.id, st.id, { isCompleted: !st.isCompleted }), 'Could not update subtask.')}
                          className="flex flex-1 items-start gap-2 text-left text-sm"
                        >
                          {st.isCompleted
                            ? <CheckSquare size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                            : <Square size={16} className="mt-0.5 shrink-0 text-slate-400" />}
                          <span className={st.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}>
                            {st.title}
                            <span className="ml-2 text-[11px] text-slate-400">by {st.createdByName || st.createdByType}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm('Delete this subtask?') && run(() => deleteSubtask(task.id, st.id), 'Could not delete subtask.')}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Conversation & Shared Files</h2>
                <div className="mb-3 max-h-80 flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-slate-400">No messages yet. Start the conversation or share files below.</p>
                  ) : messages.map((m) => {
                    const isAdmin = m.senderType === 'admin';
                    return (
                      <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${isAdmin ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <div className={`mb-1 flex items-center gap-2 text-[11px] ${isAdmin ? 'text-slate-300' : 'text-slate-500'}`}>
                            <span className="font-semibold">{m.senderName}</span>
                            <span>({isAdmin ? 'Admin' : 'Employee'})</span>
                            <span>· {new Date(m.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}
                          {m.attachments?.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {m.attachments.map((a) => {
                                const url = resolveFileUrl(a.filePath);
                                return isImage(a.mimeType) ? (
                                  <a key={a.id} href={url} target="_blank" rel="noreferrer" className="block">
                                    <img src={url} alt={a.fileName} className="max-h-40 rounded-lg border border-black/10 object-cover" />
                                    <span className="mt-0.5 block text-[11px] underline opacity-80">{a.fileName}</span>
                                  </a>
                                ) : (
                                  <a
                                    key={a.id}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs underline ${isAdmin ? 'bg-white/10 text-white' : 'bg-white text-slate-700'}`}
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
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {msgFiles.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        {f.name}
                        <button type="button" onClick={() => setMsgFiles((fs) => fs.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
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
                    title="Attach files"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    placeholder="Write a message…"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={msgBusy || (!msgText.trim() && msgFiles.length === 0)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <Send size={14} /> Send
                  </button>
                </form>
              </section>
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