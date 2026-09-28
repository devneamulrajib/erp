import { useEffect, useState } from 'react';
import { CheckCircle2, Fingerprint } from 'lucide-react';
import { getTodayAttendance, checkInAttendance } from '../api/portalEmployee';

export default function CheckInCard({ onChange }) {
  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTodayAttendance()
      .then(setToday)
      .catch(() => setError("Could not load today's status."));
  }, []);

  async function handleCheckIn() {
    setBusy(true);
    setError('');
    try {
      await checkInAttendance();
      setToday(await getTodayAttendance());
      onChange?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark attendance. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const dateLabel = today?.date
    ? new Date(`${today.date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
      })
    : '';
  const status = today?.status;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
        Today's Attendance
      </p>
      <p className="text-sm text-slate-500 mb-4">{dateLabel || '…'}</p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {status === 'Present' ? (
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
          <CheckCircle2 size={20} /> You're marked present today
        </div>
      ) : status ? (
        <p className="text-sm text-slate-600">
          Today is recorded as <span className="font-semibold">{status}</span>.
        </p>
      ) : today?.weeklyOff ? (
        <p className="text-sm text-slate-600">Today is your weekly off day.</p>
      ) : (
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={busy || !today}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-slate-800 disabled:opacity-60 transition-colors"
        >
          <Fingerprint size={18} />
          {busy ? 'Marking…' : 'Mark Present'}
        </button>
      )}
    </div>
  );
}