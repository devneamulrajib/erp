import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getInboxSummary,
  getInboxMessages,
  sendInboxMessage,
  markInboxRead,
  getInboxDocuments,
  downloadInboxDocument,
  getInboxNotes,
  getInboxActivity,
} from '../api/portalInvestor';
import AmountText from '../investor/components/AmountText';
import EmptyState from '../investor/components/EmptyState';
import { CardSkeleton } from '../investor/components/SkeletonLoader';

/* ------------------------------ Helpers ------------------------------ */

const fmtDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtBytes = (n) => {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

const CATEGORY_LABELS = {
  agreement: 'Agreement',
  receipt: 'Receipt',
  statement: 'Statement',
  kyc: 'KYC / ID',
  certificate: 'Certificate',
  other: 'Document',
};

const notifyInboxChanged = () => window.dispatchEvent(new Event('investor-inbox-updated'));

/* ------------------------------ Messages ------------------------------ */

function MessagesTab() {
  const [items, setItems] = useState([]);
  const [fresh, setFresh] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getInboxMessages();
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list);
      const unread = list.filter((m) => m.direction === 'outbound' && !m.readAt).map((m) => m.id);
      setFresh(new Set(unread));
      if (unread.length) {
        await markInboxRead();
        notifyInboxChanged();
      }
    } catch (err) {
      setError(errMsg(err, 'We could not load your messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      setSendError('Please write your message first.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      await sendInboxMessage({ subject, body });
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      setSendError(errMsg(err, 'Your message could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <CardSkeleton count={2} />;
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
      <div ref={listRef} className="max-h-[52vh] min-h-[220px] space-y-3 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-5">
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            No messages yet. Write to us below, or wait for an update from the team.
          </p>
        ) : (
          items.map((m) => {
            const mine = m.direction === 'inbound';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%] ${
                    mine
                      ? 'rounded-br-md bg-[#3347B8] text-white'
                      : `rounded-bl-md border bg-white text-[#0B1530] ${fresh.has(m.id) ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-[#E3E8F2]'}`
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${mine ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    {mine ? 'You' : 'Trikon team'}
                    {fresh.has(m.id) && <span className="ml-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">New</span>}
                  </p>
                  {m.subject && <p className="mt-1 font-semibold">{m.subject}</p>}
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <p className={`mt-1.5 text-[10px] ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>{fmtDateTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="space-y-3 border-t border-slate-100 bg-white p-4 sm:p-5">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder="Subject (optional)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white"
        />
        <textarea
          rows="3"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Write a message to the Trikon team..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white"
        />
        {sendError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {sendError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">{body.length}/2000</span>
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-[#3347B8] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#263691] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------ Documents ------------------------------ */

function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getInboxDocuments();
        setDocs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(errMsg(err, 'We could not load your documents.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async (doc) => {
    setBusyId(doc.id);
    setDownloadError('');
    try {
      const res = await downloadInboxDocument(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('This document could not be downloaded. Please try again or contact us.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <CardSkeleton count={2} />;
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>;
  }
  if (docs.length === 0) {
    return <EmptyState title="No documents yet" description="Agreements, receipts and statements the team shares with you will appear here." />;
  }

  return (
    <div className="space-y-3">
      {downloadError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {downloadError}
        </p>
      )}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0B1530]">{d.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {CATEGORY_LABELS[d.category] || 'Document'}
                {d.projectName ? ` · ${d.projectName}` : ''}
                {d.agreementRef ? ` · ${d.agreementRef}` : ''}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {fmtDate(d.createdAt)} · {fmtBytes(d.fileSize)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(d)}
              disabled={busyId === d.id}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busyId === d.id ? 'Downloading...' : 'Download'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- Notes -------------------------------- */

function NotesTab() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getInboxNotes();
        setNotes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(errMsg(err, 'We could not load your notes.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <CardSkeleton count={2} />;
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>;
  }
  if (notes.length === 0) {
    return <EmptyState title="No notes yet" description="Notes the team shares with you will appear here." />;
  }

  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#0B1530]">{n.body}</p>
          <p className="mt-3 text-[11px] text-slate-400">From the Trikon team · {fmtDateTime(n.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------- Activity ------------------------------- */

const ACTIVITY_STYLE = {
  investment: 'bg-indigo-50 text-indigo-600',
  payment: 'bg-emerald-50 text-emerald-600',
  document: 'bg-amber-50 text-amber-600',
  message: 'bg-sky-50 text-sky-600',
  note: 'bg-slate-100 text-slate-600',
};

const ACTIVITY_ICON = {
  investment: 'M12 5v14M6 13l6 6 6-6',
  payment: 'M12 19V5M6 11l6-6 6 6',
  document: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
};

function ActivityTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getInboxActivity();
        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(errMsg(err, 'We could not load your activity.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <CardSkeleton count={3} />;
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>;
  }
  if (items.length === 0) {
    return <EmptyState title="No activity yet" description="Investments, payouts, documents and messages will be listed here." />;
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
      {items.map((ev) => (
        <li key={ev.key} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ACTIVITY_STYLE[ev.type] || ACTIVITY_STYLE.note}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d={ACTIVITY_ICON[ev.type] || ACTIVITY_ICON.note} />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#0B1530]">{ev.title}</p>
            <p className="truncate text-[11px] text-slate-500">
              {ev.detail ? `${ev.detail} · ` : ''}
              {fmtDateTime(ev.date)}
            </p>
          </div>
          {ev.amount != null && (
            <AmountText
              amount={ev.amount}
              className={`shrink-0 text-sm font-bold ${ev.type === 'payment' ? 'text-emerald-600' : 'text-[#0B1530]'}`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- Page --------------------------------- */

const TABS = [
  ['messages', 'Messages'],
  ['documents', 'Documents'],
  ['notes', 'Notes'],
  ['activity', 'Activity'],
];

const PortalInvestorInbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TABS.some(([k]) => k === requested) ? requested : 'messages';

  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await getInboxSummary();
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    window.addEventListener('investor-inbox-updated', loadSummary);
    return () => window.removeEventListener('investor-inbox-updated', loadSummary);
  }, [loadSummary]);

  const badge = (key) => {
    if (!summary) return null;
    if (key === 'messages') return summary.unreadMessages > 0 ? summary.unreadMessages : null;
    if (key === 'documents') return summary.documents > 0 ? summary.documents : null;
    if (key === 'notes') return summary.notes > 0 ? summary.notes : null;
    return null;
  };

  return (
    <div className="space-y-6 text-[#0B1530]">
      <div>
        <h1 className="font-wealth-display text-xl font-bold md:text-2xl">Inbox</h1>
        <p className="text-xs text-slate-500">Messages, documents and updates from the Trikon team</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#E3E8F2] bg-white p-1 shadow-sm" role="tablist" aria-label="Inbox sections">
        {TABS.map(([key, label]) => {
          const selected = tab === key;
          const count = badge(key);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSearchParams({ tab: key }, { replace: true })}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                selected ? 'bg-[#3347B8] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              {count != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    selected ? 'bg-white/25 text-white' : key === 'messages' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'messages' && <MessagesTab />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
};

export default PortalInvestorInbox;