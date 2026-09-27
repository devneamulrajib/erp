import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Truck, FileText, Download, Wallet } from 'lucide-react';
import {
  getPortalPurchaseOrder, confirmPurchaseOrder, updateDeliveryStatus,
  downloadInvoice, confirmPaymentReceived,
} from '../api/portalPurchaseOrders';
import PortalLayout from '../components/PortalLayout';

const DELIVERY_STEPS = ['Pending', 'Shipped', 'Delivered'];

function StatusBadge({ status }) {
  const map = {
    Submitted: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    Acknowledged: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalPurchaseOrderView() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    getPortalPurchaseOrder(id)
      .then(setOrder)
      .catch(() => setError('Could not load this order.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function handleConfirm() {
    setBusy(true);
    try {
      const updated = await confirmPurchaseOrder(id);
      setOrder((o) => ({ ...o, ...updated }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvanceDelivery(nextStatus) {
    setBusy(true);
    try {
      const updated = await updateDeliveryStatus(id, nextStatus);
      setOrder((o) => ({ ...o, ...updated }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadInvoice() {
    setBusy(true);
    try {
      await downloadInvoice(id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPayment() {
    setBusy(true);
    try {
      const updated = await confirmPaymentReceived(id);
      setOrder((o) => ({ ...o, ...updated }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setBusy(false);
    }
  }

  const currentStepIndex = order ? DELIVERY_STEPS.indexOf(order.deliveryStatus || 'Pending') : 0;

  return (
    <PortalLayout>
      <Link to="/portal/orders" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to orders
      </Link>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading…</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {order && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{order.code}</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {order.titleOfWork || 'Purchase Order'}
              </h1>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Confirm */}
          {order.status !== 'Acknowledged' ? (
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 mb-5"
            >
              <CheckCircle2 size={14} />
              Confirm Order
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium mb-5">
              <CheckCircle2 size={15} /> Confirmed
              {order.supplierConfirmedAt && (
                <span className="text-slate-400 font-normal">on {new Date(order.supplierConfirmedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Delivery status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Truck size={15} className="text-slate-400" /> Delivery Status
            </h2>
            <div className="flex items-center gap-2 mb-4">
              {DELIVERY_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`h-1.5 flex-1 rounded-full ${i <= currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  <span className={`text-xs font-medium ${i <= currentStepIndex ? 'text-slate-800' : 'text-slate-400'}`}>{step}</span>
                </div>
              ))}
            </div>
            {currentStepIndex < DELIVERY_STEPS.length - 1 && (
              <button
                onClick={() => handleAdvanceDelivery(DELIVERY_STEPS[currentStepIndex + 1])}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Mark as {DELIVERY_STEPS[currentStepIndex + 1]}
              </button>
            )}
            {order.deliveryStatus === 'Delivered' && !order.deliveryConfirmedAt && (
              <p className="text-xs text-amber-600 mt-3">Waiting for admin to confirm delivery.</p>
            )}
            {order.deliveryConfirmedAt && (
              <p className="text-xs text-emerald-600 mt-3">
                Delivery confirmed by admin on {new Date(order.deliveryConfirmedAt).toLocaleDateString()}.
              </p>
            )}
          </div>

          {/* Invoice */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={15} className="text-slate-400" /> Invoice
            </h2>
            {order.convertedToBillId ? (
              <button
                onClick={handleDownloadInvoice}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                <Download size={14} /> Download Invoice
              </button>
            ) : (
              <p className="text-sm text-slate-400">Invoice will be generated once admin confirms delivery.</p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Wallet size={15} className="text-slate-400" /> Payment
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              Status: <span className={order.paymentStatus === 'Paid' ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {order.paymentStatus || 'Unpaid'}
              </span>
            </p>
            {order.paymentStatus === 'Paid' && !order.supplierPaymentConfirmedAt && (
              <button
                onClick={handleConfirmPayment}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Confirm Payment Received
              </button>
            )}
            {order.supplierPaymentConfirmedAt && (
              <p className="text-xs text-emerald-600">
                You confirmed receipt on {new Date(order.supplierPaymentConfirmedAt).toLocaleDateString()}.
              </p>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}