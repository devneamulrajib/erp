import { useEffect, useState } from 'react';
import { FileCheck2, Check, X as XIcon } from 'lucide-react';
import { getPortalQuotes, respondToQuote } from '../api/portalQuotes';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Accepted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
    Submitted: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    'Under Review': 'bg-amber-50 text-amber-600 ring-amber-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalQuotesPage() {
  const user = getPortalUser();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    getPortalQuotes().then(setQuotes).catch(() => setQuotes([])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function respond(id, decision) {
    try {
      await respondToQuote(id, decision);
      load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to respond');
    }
  }

  if (user?.role !== 'customer') {
    return <PortalLayout><p className="text-sm text-slate-400">Quotes are only available for customer accounts.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Quotations</h1>
        <p className="text-sm text-slate-400 mt-0.5">Review and respond to quotes sent to you</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <FileCheck2 size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">All Quotations</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Grand Total</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No quotes yet</td></tr>
            ) : quotes.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{q.code}</td>
                <td className="px-4 py-3 text-slate-600">{q.date}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{Number(q.grandTotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {q.status === 'Submitted' || q.status === 'Under Review' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => respond(q.id, 'Accepted')}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-medium transition-colors"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        onClick={() => respond(q.id, 'Rejected')}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
                      >
                        <XIcon size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}