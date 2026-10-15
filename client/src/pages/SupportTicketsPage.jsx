import { useEffect, useMemo, useState } from 'react';
import { Search, X, ExternalLink, LifeBuoy } from 'lucide-react';
import Topbar from '../components/Topbar';
import {
  getAllSupportTickets,
  getSupportTicket,
  updateSupportTicket,
} from '../api/supportTicket';

const STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};
const SEVERITY_STYLE = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-rose-100 text-rose-700',
};
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const TYPE_LABEL = { bug: 'Bug', difficulty: 'Difficulty', suggestion: 'Suggestion' };

const label = (s) => s.replace('_', ' ');

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
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
      setTickets(await getAllSupportTickets());
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
  }, []);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    tickets.forEach((t) => (c[t.status] = (c[t.status] || 0) + 1));
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
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    statusFilter === s
                      ? 'border-slate-900 bg-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-semibold capitalize text-slate-500">{label(s)}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts[s] || 0}</p>
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
                <option value="all">All severities</option>
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
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No tickets found</td></tr>
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
                        <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[t.type]}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SEVERITY_STYLE[t.severity]}`}>
                            {t.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[t.status]}`}>
                            {label(t.status)}
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
            onClose={() => setSelectedId(null)}
            onSaved={load}
          />
        )}
      </div>
    </div>
  );
}

function TicketDetail({ id, onClose, onSaved }) {
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState('open');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    getSupportTicket(id)
      .then((t) => {
        setTicket(t);
        setStatus(t.status);
        setNote(t.resolutionNote || '');
      })
      .catch(() => setError('Failed to load ticket'));
  }, [id]);

  async function save() {
    setError('');
    setSavedMsg('');
    setSaving(true);
    try {
      await updateSupportTicket(id, { status, resolutionNote: note });
      setSavedMsg('Saved');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

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
                    {TYPE_LABEL[ticket.type]}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SEVERITY_STYLE[ticket.severity]}`}>
                    {ticket.severity}
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

              {ticket.screenshot && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">Screenshot</p>
                  <a href={ticket.screenshot} target="_blank" rel="noreferrer">
                    <img src={ticket.screenshot} alt="Screenshot" className="max-h-72 rounded-xl border border-slate-200" />
                  </a>
                </div>
              )}

              {ticket.userAgent && (
                <p className="break-all text-[10px] text-slate-400">{ticket.userAgent}</p>
              )}

              <hr className="border-slate-100" />

              <div className="space-y-3">
                <label className="block text-[11px] font-semibold text-slate-500">
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs capitalize outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{label(s)}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-500">
                  Resolution note (the reporter will see this)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="What was the cause and what was done to fix it?"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
                {savedMsg && <p className="text-xs font-medium text-emerald-600">{savedMsg}</p>}

                <div className="flex justify-end">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="h-9 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}