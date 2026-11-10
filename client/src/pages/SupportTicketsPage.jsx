import { useEffect, useMemo, useState } from 'react';
import { Search, X, ExternalLink, LifeBuoy, Paperclip } from 'lucide-react';
import Topbar from '../components/Topbar';
import {
  listSupportTickets,
  getSupportMeta,
  getSupportTicket,
  changeSupportTicketStatus,
  assignSupportTicket,
  addSupportMessage,
  downloadSupportAttachment,
} from '../api/supportTicket';

const STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_customer: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};
const SEVERITY_STYLE = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-rose-100 text-rose-700',
};
const DEFAULT_STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'pending_customer', label: 'Pending customer' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];
const TYPE_LABEL = { bug: 'Bug', difficulty: 'Difficulty', suggestion: 'Suggestion' };

const pretty = (s) => String(s || '').replace(/_/g, ' ');
const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

// Loads every page (100 per page) so counts and filters cover all tickets.
async function fetchAllTickets() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await listSupportTickets({ pageSize: 100, page });
    all.push(...(res.items || []));
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= 30);
  return all;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setTickets(await fetchAllTickets());
      setError('');
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'You do not have access to this page.'
          : 'Failed to load tickets.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getSupportMeta()
      .then((m) => {
        if (Array.isArray(m.statuses) && m.statuses.length) setStatuses(m.statuses);
        setAgents(m.agents || []);
      })
      .catch(() => {});
  }, []);

  const statusLabel = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.key, s.label])),
    [statuses]
  );

  const counts = useMemo(() => {
    const c = {};
    tickets.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
      if (q) {
        const hay = `${t.ticketNo} ${t.title} ${t.reporterName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, typeFilter, severityFilter, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />

      <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <LifeBuoy size={20} className="text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Support Tickets</h1>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : (
          <>
            {/* Status counts */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {statuses.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    statusFilter === s.key
                      ? 'border-slate-900 bg-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts[s.key] || 0}</p>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ticket no, title or reporter..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"
              >
                <option value="all">All types</option>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs capitalize outline-none"
              >
                <option value="all">All priorities</option>
                {['low', 'medium', 'high', 'critical'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Reporter</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No tickets found</td></tr>
                  ) : (
                    filtered.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">{t.ticketNo}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-slate-800">{t.title}</td>
                        <td className="px-4 py-3 text-slate-600">{t.reporterName}</td>
                        <td className="px-4 py-3 text-slate-600">{t.assignedToName || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[t.type] || t.type}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SEVERITY_STYLE[t.severity] || SEVERITY_STYLE.low}`}>
                            {t.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status] || STATUS_STYLE.closed}`}>
                            {statusLabel[t.status] || pretty(t.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedId && (
          <TicketDetail
            id={selectedId}
            statusLabel={statusLabel}
            agents={agents}
            onClose={() => setSelectedId(null)}
            onSaved={load}
          />
        )}
      </div>
    </div>
  );
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ImagePreview({ ticketId, att }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = '';
    let alive = true;
    downloadSupportAttachment(ticketId, att.id, true)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ticketId, att.id]);
  if (!src) return null;
  return <img src={src} alt={att.originalName} className="max-h-72 rounded-xl border border-slate-200" />;
}

function TicketDetail({ id, statusLabel, agents, onClose, onSaved }) {
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [assignee, setAssignee] = useState('');
  const [reply, setReply] = useState('');
  const [kind, setKind] = useState('reply');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  async function loadDetail() {
    try {
      const d = await getSupportTicket(id);
      setDetail(d);
      setStatus(d.ticket.status);
      setAssignee(d.ticket.assignedToId ? String(d.ticket.assignedToId) : '');
      setError('');
    } catch (err) {
      setError(errMsg(err, 'Failed to load ticket'));
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ticket = detail?.ticket;
  const can = detail?.can || {};

  // Current status + the statuses this user may move to
  const statusOptions = useMemo(() => {
    if (!detail) return [];
    const keys = (detail.transitions || []).map((t) =>
      typeof t === 'string' ? t : t.key || t.status || t.to
    );
    return Array.from(new Set([detail.ticket.status, ...keys.filter(Boolean)]));
  }, [detail]);

  async function run(fn, okText) {
    setError('');
    setSavedMsg('');
    setBusy(true);
    try {
      await fn();
      setSavedMsg(okText);
      await loadDetail();
      onSaved();
    } catch (err) {
      setError(errMsg(err, 'Action failed'));
    } finally {
      setBusy(false);
    }
  }

  const saveStatus = () =>
    run(async () => {
      await changeSupportTicketStatus(id, status, statusNote.trim() || undefined);
      setStatusNote('');
    }, 'Status updated');

  const saveAssignee = () =>
    run(() => assignSupportTicket(id, assignee || null), 'Assignee updated');

  const sendMessage = () =>
    run(async () => {
      const fd = new FormData();
      fd.append('body', reply);
      fd.append('kind', kind);
      await addSupportMessage(id, fd);
      setReply('');
    }, kind === 'note' ? 'Note added' : 'Reply sent');

  async function download(att) {
    try {
      saveBlob(await downloadSupportAttachment(id, att.id), att.originalName);
    } catch (err) {
      setError(errMsg(err, 'Download failed'));
    }
  }

  const statusChanged = ticket && status !== ticket.status;
  const assigneeChanged = ticket && assignee !== (ticket.assignedToId ? String(ticket.assignedToId) : '');

  return (
    <div
      className="fixed inset-0 z-[10000] flex justify-end bg-slate-900/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div>
            <p className="text-xs font-semibold text-slate-900">{ticket?.ticketNo || 'Ticket'}</p>
            {ticket && (
              <p className="text-[10px] text-slate-400">
                {ticket.reporterName} · {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!ticket ? (
            <p className="py-10 text-center text-xs text-slate-400">{error || 'Loading…'}</p>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{ticket.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {TYPE_LABEL[ticket.type] || ticket.type}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SEVERITY_STYLE[ticket.severity] || SEVERITY_STYLE.low}`}>
                    {ticket.severity}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[ticket.status] || STATUS_STYLE.closed}`}>
                    {statusLabel[ticket.status] || pretty(ticket.status)}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">Description</p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
                  {ticket.description}
                </p>
              </div>

              {ticket.pageUrl && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">Page where it happened</p>
                  <a
                    href={ticket.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 break-all text-xs text-blue-600 hover:underline"
                  >
                    {ticket.pageUrl} <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Attachments (includes the old screenshot) */}
              {detail.attachments.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">Attachments</p>
                  <div className="space-y-2">
                    {detail.attachments.map((a) => (
                      <div key={a.id} className="space-y-2">
                        {a.isImage && <ImagePreview ticketId={id} att={a} />}
                        <button
                          onClick={() => download(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                        >
                          <Paperclip size={12} /> {a.originalName}
                          {a.isInternal && <span className="text-amber-600">(internal)</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ticket.userAgent && (
                <p className="break-all text-[10px] text-slate-400">{ticket.userAgent}</p>
              )}

              <hr className="border-slate-100" />

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500">
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={statusOptions.length <= 1}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{statusLabel[s] || pretty(s)}</option>
                    ))}
                  </select>
                </label>
                {statusChanged && (
                  <>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={3}
                      placeholder="Note for this change (e.g. cause and fix when resolving)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={saveStatus}
                        disabled={busy}
                        className="h-9 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busy ? 'Saving…' : 'Update status'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Assignee */}
              {can.assign && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Assigned to
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={String(a.id)}>{a.name}</option>
                      ))}
                    </select>
                  </label>
                  {assigneeChanged && (
                    <div className="flex justify-end">
                      <button
                        onClick={saveAssignee}
                        disabled={busy}
                        className="h-9 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busy ? 'Saving…' : 'Update assignee'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <hr className="border-slate-100" />

              {/* Conversation */}
              <div>
                <p className="mb-2 text-[11px] font-semibold text-slate-500">Conversation</p>
                {detail.messages.length === 0 ? (
                  <p className="text-xs text-slate-400">No messages yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl p-3 text-xs ${
                          m.kind === 'note' ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'
                        }`}
                      >
                        <p className="mb-1 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-700">{m.authorName}</span>
                          {m.kind === 'note' && ' · internal note'}
                          {' · '}
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(can.reply || can.note) && (
                <div className="space-y-2">
                  {can.reply && can.note && (
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
                      {[['reply', 'Reply to reporter'], ['note', 'Internal note']].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setKind(k)}
                          className={`rounded-md px-3 py-1 font-medium ${
                            kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder={kind === 'note' ? 'Internal note (not visible to the reporter)' : 'Write a reply'}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={sendMessage}
                      disabled={busy || !reply.trim()}
                      className="h-9 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {busy ? 'Sending…' : kind === 'note' ? 'Add note' : 'Send reply'}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
              {savedMsg && <p className="text-xs font-medium text-emerald-600">{savedMsg}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}