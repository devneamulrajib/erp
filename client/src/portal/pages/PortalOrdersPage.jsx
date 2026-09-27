import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, ClipboardList, CheckCircle2, ChevronDown, Truck,
  PackageCheck, Download, BadgeCheck, Eye, Send,
} from 'lucide-react';
import {
  getPortalPurchaseOrders, acknowledgePurchaseOrder, updateDeliveryStatus,
  downloadInvoice, confirmPaymentReceived,
} from '../api/portalPurchaseOrders';
import { getPortalMaterialRequisitions } from '../api/portalMaterialRequisitions';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Acknowledged: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Submitted: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    'Sent to Supplier': 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Open: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    Converted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    PartiallyConverted: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

function DeliveryBadge({ status }) {
  const map = {
    Pending: 'bg-slate-100 text-slate-600',
    Shipped: 'bg-sky-50 text-sky-600',
    Delivered: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] || map.Pending}`}>
      {status || 'Pending'}
    </span>
  );
}

export default function PortalOrdersPage() {
  const user = getPortalUser();
  const [orders, setOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    Promise.all([getPortalPurchaseOrders(), getPortalMaterialRequisitions()])
      .then(([o, r]) => { setOrders(o); setRequisitions(r); })
      .catch(() => { setOrders([]); setRequisitions([]); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function runAction(id, fn) {
    setBusyId(id);
    setOpenId(null);
    try {
      await fn();
      load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (user?.role !== 'supplier' && user?.role !== 'vendor') {
    return <PortalLayout><p className="text-sm text-slate-400">Orders are only available for supplier/vendor accounts.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Purchase Orders</h1>
        <p className="text-sm text-slate-400 mt-0.5">Orders and requisitions assigned to you</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden mb-8">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <ShoppingCart size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Purchase Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Delivery</th>
                <th className="px-4 py-3 text-left font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Grand Total</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No purchase orders yet</td></tr>
              ) : orders.map((o) => {
                const needsAck = o.status === 'Submitted' || o.status === 'Sent to Supplier';
                const canShip = o.status === 'Acknowledged' && o.deliveryStatus === 'Pending';
                const canDeliver = o.status === 'Acknowledged' && o.deliveryStatus === 'Shipped';
                const hasInvoice = !!o.convertedToBillId;
                const canConfirmPayment = o.paymentStatus === 'Paid' && !o.supplierPaymentConfirmedAt;
                const hasAnyAction = needsAck || canShip || canDeliver || hasInvoice || canConfirmPayment;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.code}</td>
                    <td className="px-4 py-3 text-slate-600">{o.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3"><DeliveryBadge status={o.deliveryStatus} /></td>
                    <td className="px-4 py-3">
                      {o.paymentStatus === 'Paid' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <BadgeCheck size={12} /> Paid{o.supplierPaymentConfirmedAt ? ' · Confirmed' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{Number(o.grandTotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={() => setOpenId(openId === o.id ? null : o.id)}
                        disabled={busyId === o.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                      >
                        {busyId === o.id ? 'Working…' : 'Action'} <ChevronDown size={12} />
                      </button>
                      {openId === o.id && (
                        <div className="absolute right-4 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg shadow-slate-900/10 z-10 overflow-hidden text-left">
                          {needsAck && (
                            <button onClick={() => runAction(o.id, () => acknowledgePurchaseOrder(o.id))} className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                              <CheckCircle2 size={13} /> Acknowledge Order
                            </button>
                          )}
                          {canShip && (
                            <button onClick={() => runAction(o.id, () => updateDeliveryStatus(o.id, 'Shipped'))} className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                              <Truck size={13} /> Mark as Shipped
                            </button>
                          )}
                          {canDeliver && (
                            <button onClick={() => runAction(o.id, () => updateDeliveryStatus(o.id, 'Delivered'))} className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                              <PackageCheck size={13} /> Mark as Delivered
                            </button>
                          )}
                          {hasInvoice && (
                            <button onClick={() => runAction(o.id, () => downloadInvoice(o.id))} className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Download size={13} /> Download Invoice
                            </button>
                          )}
                          {canConfirmPayment && (
                            <button onClick={() => runAction(o.id, () => confirmPaymentReceived(o.id))} className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <BadgeCheck size={13} /> Confirm Payment Received
                            </button>
                          )}
                          {!hasAnyAction && (
                            <p className="px-3.5 py-2.5 text-xs text-slate-400">No actions available</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <ClipboardList size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Material Requisitions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requisitions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No requisitions yet</td></tr>
              ) : requisitions.map((r) => {
                const myQuotation = (r.quotations || [])[0];
                const needsResponse = r.status === 'Open' && (!myQuotation || myQuotation.status === 'NeedsCorrection');
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.code}</td>
                    <td className="px-4 py-3 text-slate-600">{r.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{Number(r.subtotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/portal/material-requisitions/${r.id}`}
                        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                          needsResponse ? 'text-amber-600 hover:text-amber-700' : 'text-indigo-600 hover:text-indigo-700'
                        }`}
                      >
                        {needsResponse ? <><Send size={12} /> Respond</> : <><Eye size={12} /> View</>}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}