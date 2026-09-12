import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPortalDashboard } from '../api/portalDashboard';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

export default function PortalDashboard() {
  const user = getPortalUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPortalDashboard()
      .then(setData)
      .catch(() => setError('Could not load your dashboard right now.'))
      .finally(() => setLoading(false));
  }, []);

  const isSupplierOrVendor = user?.role === 'supplier' || user?.role === 'vendor';

  return (
    <PortalLayout>
      {loading && <p className="text-sm text-slate-500">Loading your dashboard…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Orders" value={data.cards.totalOrders} />
            <StatCard label="Pending Requests" value={data.cards.pendingRequests} />
            <StatCard label="Pending Quotations" value={data.cards.pendingQuotations} />
            <StatCard label="Outstanding Balance" value={data.cards.outstandingBalance} money />
          </div>

          {!isSupplierOrVendor && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Recent Invoices</h2>
                <Link to="/portal/invoices" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentInvoices.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">No invoices yet</td></tr>
                  ) : data.recentInvoices.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-mono text-xs">{b.code}</td>
                      <td className="px-4 py-3">{b.date}</td>
                      <td className="px-4 py-3 text-right">{Number(b.due || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{Number(b.paid || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Recent Requests</h2>
              <Link to="/portal/requests" className="text-xs text-indigo-600 hover:underline">View all</Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentRequests.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-slate-400">No requests yet</td></tr>
                ) : data.recentRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3">{r.subject}</td>
                    <td className="px-4 py-3">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalLayout>
  );
}

function StatCard({ label, value, money }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-mono font-semibold text-slate-800">
        {money ? `৳${Number(value).toLocaleString()}` : value}
      </p>
    </div>
  );
}