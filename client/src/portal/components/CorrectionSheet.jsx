import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { requestAttendanceCorrection } from '../api/portalEmployee';
import BottomSheet from './BottomSheet';

const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';
const dateInput = (d) => d.toLocaleDateString('en-CA');

// initialDate: 'YYYY-MM-DD' to prefill (e.g. when tapped from an Absent day)
export default function CorrectionSheet({ open, onClose, onDone, initialDate = '' }) {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const earliest = new Date(today.getTime() - 30 * 86400000);

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setDate(initialDate || ''); setReason(''); setError(''); }
  }, [open, initialDate]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await requestAttendanceCorrection({ date, reason });
      onDone();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send the request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Attendance correction">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Forgot to Mark Present? Choose the day and tell HR what happened. If approved, that day becomes Present.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
          <input
            type="date"
            required
            value={date}
            min={dateInput(earliest)}
            max={dateInput(yesterday)}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 px-3.5 rounded-xl border border-slate-200 text-base text-slate-900 outline-none focus:border-slate-900"
          />
          <p className="text-[11px] text-slate-400 mt-1">Last 30 days only. For today, use Mark Present.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reason</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. I was at the site office all day but forgot to check in"
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-base text-slate-900 outline-none focus:border-slate-900 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{error}</p>}

        <button
          type="submit"
          disabled={saving || !date || reason.trim().length < 5}
          className={`w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-700 disabled:opacity-50 ${TAP}`}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Send request
        </button>
      </form>
    </BottomSheet>
  );
}