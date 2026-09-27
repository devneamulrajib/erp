import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { getPortalRequests, createPortalRequest } from '../api/portalRequests';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Resolved: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
    Open: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    'In Review': 'bg-amber-50 text-amber-600 ring-amber-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    getPortalRequests().then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject || !details) return;
    setSubmitting(true);
    setError('');
    try {
      await createPortalRequest(subject, details);
      setSubject('');
      setDetails('');
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
        <h1 className="text-2xl font-semibold text-white tracking-tight">Business Requests</h1>
        <p className="text-sm text-slate-400 mt-0.5">Submit a request and track its status</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-black/20 p-6 mb-8">
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
            placeholder="e.g. Request for extended payment terms"
          />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <MessageSquare size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Your Requests</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Admin Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No requests yet</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.code}</td>
                <td className="px-4 py-3 text-slate-700">{r.subject}</td>
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