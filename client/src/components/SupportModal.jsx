import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LifeBuoy, ImagePlus, Inbox } from 'lucide-react';
import { createSupportTicket, getMySupportTickets } from '../api/supportTicket';

const TYPES = [
  { value: 'bug', label: 'Bug / Error' },
  { value: 'difficulty', label: 'Difficulty using something' },
  { value: 'suggestion', label: 'Suggestion' },
];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

const emptyForm = {
  type: 'bug',
  severity: 'medium',
  title: '',
  description: '',
  screenshot: '',
};

export default function SupportModal({ open, onClose }) {
  const [tab, setTab] = useState('new');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || tab !== 'mine') return;
    setLoadingMine(true);
    getMySupportTickets()
      .then(setMine)
      .catch(() => setMine([]))
      .finally(() => setLoadingMine(false));
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && handleClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setError('');
    setSuccess('');
    setTab('new');
    onClose();
  }

  function readFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file');
    if (file.size > 3 * 1024 * 1024) return setError('Screenshot must be under 3MB');
    setError('');
    const reader = new FileReader();
    reader.onload = () => set('screenshot', reader.result);
    reader.readAsDataURL(file);
  }

  function handlePaste(e) {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) readFile(item.getAsFile());
  }

  async function submit() {
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      return setError('Please fill in the title and description');
    }
    setSubmitting(true);
    try {
      const res = await createSupportTicket({ ...form, pageUrl: window.location.href });
      setSuccess(`Report submitted. Your reference is ${res.ticketNo}`);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit report');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 p-4"
      onPaste={handlePaste}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <LifeBuoy size={16} className="text-slate-700" />
            <span className="text-sm font-semibold text-slate-900">Support</span>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-2">
          {[
            ['new', 'New report'],
            ['mine', 'My reports'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setSuccess('');
              }}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                tab === k
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          {tab === 'new' ? (
            success ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm font-medium text-emerald-700">{success}</p>
                <button
                  onClick={() => setSuccess('')}
                  className="text-xs font-semibold text-slate-700 underline"
                >
                  Report another
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-medium text-slate-500">
                    What kind of problem?
                    <select
                      value={form.type}
                      onChange={(e) => set('type', e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-slate-500">
                    How serious?
                    <select
                      value={form.severity}
                      onChange={(e) => set('severity', e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs capitalize text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-[11px] font-medium text-slate-500">
                  Short title
                  <input
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Cannot save flat sale"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="block text-[11px] font-medium text-slate-500">
                  What happened? What did you expect?
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={5}
                    placeholder="Steps you took, what you saw, what you expected"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <div className="text-[11px] font-medium text-slate-500">
                  Screenshot (optional, or paste with Ctrl+V)
                  <label className="mt-1 flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-xs text-slate-500 hover:bg-slate-50">
                    <ImagePlus size={14} />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => readFile(e.target.files?.[0])}
                    />
                  </label>
                  {form.screenshot && (
                    <div className="mt-2 flex items-start gap-2">
                      <img
                        src={form.screenshot}
                        alt="Screenshot preview"
                        className="max-h-28 rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => set('screenshot', '')}
                        className="text-[11px] font-semibold text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400">The page you are on is attached automatically.</p>
                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleClose}
                    className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            )
          ) : loadingMine ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
          ) : mine.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Inbox size={28} className="mb-2 stroke-[1.5] text-slate-300" />
              <p className="text-xs font-medium text-slate-500">You haven't reported anything yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mine.map((t) => (
                <li key={t.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">{t.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        STATUS_STYLE[t.status]
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {t.ticketNo} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                  {t.resolutionNote && (
                    <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                      <span className="font-semibold">Resolution:</span> {t.resolutionNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}