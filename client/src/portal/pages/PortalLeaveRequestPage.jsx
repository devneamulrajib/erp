import { useEffect, useState } from 'react';
import { CalendarDays, Send } from 'lucide-react';
import { getEmployeeLeaveRequests, requestEmployeeLeave } from '../api/portalEmployee';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Approved: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
    Pending: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalLeaveRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    getEmployeeLeaveRequests().then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  // FIX: if an already-picked "To date" ends up before a newly-picked
  // "From date", clear it instead of leaving a silently-invalid range.
  function handleFromDateChange(value) {
    setFromDate(value);
    if (toDate && value && toDate < value) {
      setToDate('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!fromDate || !toDate) {
      setError('Please select both a From date and a To date');
      return;
    }
    // FIX: reject a reversed range client-side too, so the person gets
    // instant feedback instead of relying on the server response alone.
    if (toDate < fromDate) {
      setError('To date cannot be before From date');
      return;
    }

    setSubmitting(true);
    try {
      await requestEmployeeLeave({ fromDate, toDate, reason });
      setFromDate('');
      setToDate('');
      setReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Day Off Requests</h1>
        <p className="text-sm text-slate-400 mt-0.5">Request leave and track approval status</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-black/20 p-6 mb-8">
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
            />
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition" placeholder="e.g. Family event" />
        </div>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors">
          <Send size={14} />
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <CalendarDays size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Your Requests</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">From</th>
              <th className="px-4 py-3 text-left font-medium">To</th>
              <th className="px-4 py-3 text-left font-medium">Days</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Admin Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No requests yet</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 text-slate-700">{r.fromDate}</td>
                <td className="px-4 py-3 text-slate-700">{r.toDate}</td>
                <td className="px-4 py-3 text-slate-700">{r.days}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-slate-500">{r.adminNote || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}