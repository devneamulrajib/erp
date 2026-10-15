// client/src/components/InvestorProfileTabs.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getInvestorDocuments,
  uploadInvestorDocument,
  updateInvestorDocument,
  deleteInvestorDocument,
  downloadInvestorDocument,
  getInvestorMessages,
  sendInvestorMessage,
  getInvestorNotes,
  createInvestorNote,
  updateInvestorNote,
  deleteInvestorNote,
  getInvestorActivity,
} from '../api/investor';

/* ------------------------------ Helpers ------------------------------ */

const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const fmtBytes = (n) => {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong.';

const panelCls = 'rounded-xl border border-[#EEF0F4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#F6B01E] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/25';
const btnPrimary =
  'rounded-lg bg-[#F6B01E] px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#e9a30f] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/60 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50';

function Panel({ title, subtitle, action, children }) {
  return (
    <section className={panelCls}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-slate-400">{children}</p>;
}

function Label({ text, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{text}</span>
      {children}
    </label>
  );
}

function Pill({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ------------------------------ Documents ------------------------------ */

const DOC_CATEGORIES = [
  ['agreement', 'Agreement'],
  ['receipt', 'Receipt'],
  ['statement', 'Statement'],
  ['kyc', 'KYC / ID'],
  ['certificate', 'Certificate'],
  ['other', 'Other'],
];
const categoryLabel = (key) => DOC_CATEGORIES.find(([k]) => k === key)?.[1] || 'Other';

export function DocumentsTab({ investorId, investments = [] }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('agreement');
  const [investmentId, setInvestmentId] = useState('');
  const [visible, setVisible] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getInvestorDocuments(investorId);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  const investmentLabel = (id) => {
    const inv = investments.find((i) => i.id === id);
    return inv ? inv.investmentCode || inv.code : '—';
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('category', category);
      if (investmentId) fd.append('investmentId', investmentId);
      fd.append('visibleToInvestor', String(visible));
      fd.append('file', file);
      await uploadInvestorDocument(investorId, fd);
      setFile(null);
      setTitle('');
      setInvestmentId('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  const toggleVisible = async (doc) => {
    try {
      await updateInvestorDocument(doc.id, { visibleToInvestor: !doc.visibleToInvestor });
      setDocs((list) => list.map((d) => (d.id === doc.id ? { ...d, visibleToInvestor: !d.visibleToInvestor } : d)));
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await deleteInvestorDocument(doc.id);
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await downloadInvestorDocument(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download this file. It may have been removed from the server.');
    }
  };

  return (
    <div className="space-y-5">
      <Panel title="Upload a document" subtitle="PDF, images, Word or Excel files, up to 10 MB.">
        <form onSubmit={handleUpload} className="grid gap-4 sm:grid-cols-2">
          <Label text="File">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
              }}
              className={inputCls}
            />
          </Label>
          <Label text="Title">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Signed agreement" />
          </Label>
          <Label text="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {DOC_CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Label>
          <Label text="Linked investment (optional)">
            <select value={investmentId} onChange={(e) => setInvestmentId(e.target.value)} className={inputCls}>
              <option value="">Not linked</option>
              {investments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.investmentCode || i.code} · {i.project?.name || i.projectName || 'General business'}
                </option>
              ))}
            </select>
          </Label>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#F6B01E]" />
            Visible to the investor in their portal
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={uploading} className={btnPrimary}>
              {uploading ? 'Uploading...' : 'Upload document'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Documents" subtitle={`${docs.length} ${docs.length === 1 ? 'file' : 'files'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : docs.length === 0 ? (
          <Empty>No documents uploaded yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-[#F7F8FB] text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Document</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Investment</th>
                  <th className="px-3 py-2.5 font-medium">Size</th>
                  <th className="px-3 py-2.5 font-medium">Uploaded</th>
                  <th className="px-3 py-2.5 font-medium">Portal</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <tr key={d.id} className="hover:bg-[#FAFBFD]">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{d.title}</p>
                      <p className="max-w-[220px] truncate text-xs text-slate-500">{d.originalName}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{categoryLabel(d.category)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{d.investmentId ? investmentLabel(d.investmentId) : '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{fmtBytes(d.fileSize)}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {fmtDateTime(d.createdAt)}
                      {d.uploadedBy && <span className="block text-slate-400">by {d.uploadedBy}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => toggleVisible(d)} title="Click to change" className="focus:outline-none">
                        {d.visibleToInvestor ? <Pill tone="green">Visible</Pill> : <Pill>Hidden</Pill>}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleDownload(d)} className={btnGhost}>
                          Download
                        </button>
                        <button type="button" onClick={() => handleDelete(d)} className={`${btnGhost} text-rose-600 hover:bg-rose-50`}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ----------------------------- Communication ---------------------------- */

const CHANNELS = [
  ['portal', 'Portal message'],
  ['call', 'Phone call'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['meeting', 'Meeting'],
];
const channelLabel = (key) => CHANNELS.find(([k]) => k === key)?.[1] || key;

const directionLabel = (m) =>
  m.channel === 'portal'
    ? m.direction === 'inbound'
      ? 'From investor'
      : 'Sent to investor'
    : m.direction === 'inbound'
      ? 'They contacted us'
      : 'We contacted them';

export function CommunicationTab({ investorId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('portal');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getInvestorMessages(investorId);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Write a message or a short summary first.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendInvestorMessage(investorId, { channel, direction, subject, body });
      setSubject('');
      setBody('');
      await load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const isPortal = channel === 'portal';

  return (
    <div className="space-y-5">
      <Panel
        title={isPortal ? 'Send a portal message' : 'Log a contact'}
        subtitle={
          isPortal
            ? "Delivered to the investor's portal inbox."
            : 'Internal record only. The investor does not see this.'
        }
      >
        <form onSubmit={handleSend} className="grid gap-4 sm:grid-cols-2">
          <Label text="Channel">
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
              {CHANNELS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Label>
          {!isPortal && (
            <Label text="Who reached out">
              <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls}>
                <option value="outbound">We contacted them</option>
                <option value="inbound">They contacted us</option>
              </select>
            </Label>
          )}
          <Label text="Subject (optional)" className={isPortal ? '' : 'sm:col-span-2'}>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </Label>
          <Label text={isPortal ? 'Message' : 'Summary'} className="sm:col-span-2">
            <textarea rows="3" value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} />
          </Label>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={sending} className={btnPrimary}>
              {sending ? 'Saving...' : isPortal ? 'Send message' : 'Save to log'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="History" subtitle={`${items.length} ${items.length === 1 ? 'entry' : 'entries'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : items.length === 0 ? (
          <Empty>No communication recorded yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {items.map((m) => (
              <li key={m.id} className="rounded-lg border border-slate-100 bg-[#FAFBFD] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={m.channel === 'portal' ? 'blue' : 'slate'}>{channelLabel(m.channel)}</Pill>
                  <span className="text-xs text-slate-500">{directionLabel(m)}</span>
                  {m.channel === 'portal' && m.direction === 'outbound' && (
                    <span className="text-xs text-slate-400">· {m.readAt ? `Read ${fmtDateTime(m.readAt)}` : 'Not read yet'}</span>
                  )}
                </div>
                {m.subject && <p className="mt-2 text-sm font-semibold text-slate-900">{m.subject}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {fmtDateTime(m.createdAt)}
                  {m.sentBy ? ` · ${m.sentBy}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------- Notes -------------------------------- */

export function NotesTab({ investorId, legacyNotes = '' }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getInvestorNotes(investorId);
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Write the note first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createInvestorNote(investorId, { body, visibility });
      setBody('');
      await load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (note) => {
    const next = note.visibility === 'shared' ? 'internal' : 'shared';
    try {
      await updateInvestorNote(note.id, { visibility: next });
      setNotes((list) => list.map((n) => (n.id === note.id ? { ...n, visibility: next } : n)));
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteInvestorNote(note.id);
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  return (
    <div className="space-y-5">
      {legacyNotes && (
        <Panel title="Profile notes" subtitle="Entered when the investor was registered. Internal only.">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{legacyNotes}</p>
        </Panel>
      )}

      <Panel title="Add a note" subtitle="Internal notes are for staff. Shared notes also appear in the investor's portal.">
        <form onSubmit={handleAdd} className="grid gap-4">
          <textarea rows="3" value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} placeholder="Write a note..." />
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} aria-label="Who can see this note" className={`${inputCls} sm:max-w-[240px]`}>
              <option value="internal">Internal only</option>
              <option value="shared">Shared with investor</option>
            </select>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : 'Add note'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Notes" subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : notes.length === 0 ? (
          <Empty>No notes added yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-100 bg-[#FAFBFD] p-4">
                <p className="whitespace-pre-wrap text-sm text-slate-800">{n.body}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    {fmtDateTime(n.createdAt)}
                    {n.createdBy ? ` · ${n.createdBy}` : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleVisibility(n)} title="Click to change" className="focus:outline-none">
                      {n.visibility === 'shared' ? <Pill tone="green">Shared with investor</Pill> : <Pill>Internal</Pill>}
                    </button>
                    <button type="button" onClick={() => handleDelete(n)} className={`${btnGhost} text-rose-600 hover:bg-rose-50`}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ----------------------------- Activity log ----------------------------- */

const ACTIVITY_DOT = {
  'Investment Created': 'bg-emerald-500',
  'Payment Recorded': 'bg-sky-500',
  'Payment Received': 'bg-teal-500',
  'Bank Account Added': 'bg-indigo-500',
  'Bank Account Removed': 'bg-rose-400',
  'Document Added': 'bg-amber-500',
  'Document Removed': 'bg-rose-500',
  'Message Logged': 'bg-violet-500',
  'Note Added': 'bg-slate-500',
  'Investor Created': 'bg-emerald-500',
  'Investor Updated': 'bg-slate-400',
};

export function ActivityTab({ investorId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvestorActivity(investorId);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Panel
      title="Activity log"
      subtitle="Everything recorded against this investor"
      action={
        <button type="button" onClick={load} className={btnGhost}>
          Refresh
        </button>
      }
    >
      {loading ? (
        <Empty>Loading...</Empty>
      ) : items.length === 0 ? (
        <Empty>No activity recorded yet. New investments, payments, documents and messages will appear here.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ACTIVITY_DOT[a.action] || 'bg-slate-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">{a.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {a.action}
                  {a.performedBy ? ` · ${a.performedBy}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}