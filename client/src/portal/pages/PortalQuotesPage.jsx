import { useEffect, useState } from 'react';
import { getPortalQuotes, respondToQuote } from '../api/portalQuotes';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

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
    return <PortalLayout><p className="text-sm text-slate-500">Quotes are only available for customer accounts.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Quotations</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Grand Total</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No quotes yet</td></tr>
            ) : quotes.map((q) => (
              <tr key={q.id}>
                <td className="px-4 py-3 font-mono text-xs">{q.code}</td>
                <td className="px-4 py-3">{q.date}</td>
                <td className="px-4 py-3">{q.status}</td>
                <td className="px-4 py-3 text-right">{Number(q.grandTotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  {q.status === 'Submitted' || q.status === 'Under Review' ? (
                    <>
                      <button onClick={() => respond(q.id, 'Accepted')} className="text-emerald-600 hover:underline text-xs">Accept</button>
                      <button onClick={() => respond(q.id, 'Rejected')} className="text-red-600 hover:underline text-xs">Reject</button>
                    </>
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