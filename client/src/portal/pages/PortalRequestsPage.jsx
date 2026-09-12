import { useEffect, useState } from 'react';
import { getPortalRequests, createPortalRequest } from '../api/portalRequests';
import PortalLayout from '../components/PortalLayout';

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
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Business Requests</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
            placeholder="e.g. Request for extended payment terms"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Admin Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No requests yet</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3">{r.subject}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-slate-500">{r.adminNote || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}