import { useEffect, useState } from 'react';
import { getPortalPurchaseOrders, acknowledgePurchaseOrder } from '../api/portalPurchaseOrders';
import { getPortalMaterialRequisitions } from '../api/portalMaterialRequisitions';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

export default function PortalOrdersPage() {
  const user = getPortalUser();
  const [orders, setOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([getPortalPurchaseOrders(), getPortalMaterialRequisitions()])
      .then(([o, r]) => { setOrders(o); setRequisitions(r); })
      .catch(() => { setOrders([]); setRequisitions([]); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function acknowledge(id) {
    try {
      await acknowledgePurchaseOrder(id);
      load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to acknowledge');
    }
  }

  if (user?.role !== 'supplier' && user?.role !== 'vendor') {
    return <PortalLayout><p className="text-sm text-slate-500">Orders are only available for supplier/vendor accounts.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Purchase Orders</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
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
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No purchase orders yet</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-xs">{o.code}</td>
                <td className="px-4 py-3">{o.date}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3 text-right">{Number(o.grandTotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {o.status === 'Submitted' || o.status === 'Sent to Supplier' ? (
                    <button onClick={() => acknowledge(o.id)} className="text-indigo-600 hover:underline text-xs">Acknowledge</button>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Material Requisitions</h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requisitions.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No requisitions yet</td></tr>
            ) : requisitions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-right">{Number(r.subtotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}