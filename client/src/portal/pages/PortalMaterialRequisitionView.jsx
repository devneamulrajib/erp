import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, MapPin, Tag, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { getPortalMaterialRequisition, submitQuotation } from '../api/portalMaterialRequisitions';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Open: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    PartiallyConverted: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Converted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Submitted: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
    Accepted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
    NeedsCorrection: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

function QuotationForm({ requisition, correctionNote, onSubmitted }) {
  const [available, setAvailable] = useState(() =>
    Object.fromEntries(requisition.items.map((it) => [it.id, true]))
  );
  const [offeredQty, setOfferedQty] = useState(() =>
    Object.fromEntries(requisition.items.map((it) => [it.id, it.demandQty]))
  );
  const [rates, setRates] = useState(() =>
    Object.fromEntries(requisition.items.map((it) => [it.id, '']))
  );
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = requisition.items.reduce((sum, it) => {
    if (!available[it.id]) return sum;
    const rate = Number(rates[it.id]) || 0;
    const qty = Number(offeredQty[it.id]) || 0;
    return sum + rate * qty;
  }, 0);

  function toggleAvailable(id, checked) {
    setAvailable((a) => ({ ...a, [id]: checked }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const anyAvailable = Object.values(available).some(Boolean);
    if (!anyAvailable) {
      setError('Mark at least one item as available before submitting');
      return;
    }

    const items = requisition.items.map((it) => ({
      materialRequisitionItemId: it.id,
      available: !!available[it.id],
      offeredQty: available[it.id] ? Number(offeredQty[it.id]) || 0 : 0,
      quotedRate: available[it.id] ? Number(rates[it.id]) || 0 : 0,
    }));

    const invalid = items.some((it) => it.available && (it.offeredQty <= 0 || it.quotedRate <= 0));
    if (invalid) {
      setError('Enter a valid quantity and rate for every item marked available');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitQuotation(requisition.id, { validUntil, notes, items });
      onSubmitted(created);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-1">Respond to This Requisition</h2>
      <p className="text-xs text-slate-500 mb-4">Mark each item you can deliver, then enter your quantity and rate.</p>

      {correctionNote && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          Admin requested a correction: {correctionNote}
        </div>
      )}
      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium">Can Supply</th>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-left font-medium">Unit</th>
              <th className="px-3 py-2 text-right font-medium">Requested Qty</th>
              <th className="px-3 py-2 text-right font-medium">Your Qty</th>
              <th className="px-3 py-2 text-right font-medium">Your Rate</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requisition.items.map((it) => {
              const isAvailable = !!available[it.id];
              return (
                <tr key={it.id} className={isAvailable ? '' : 'opacity-50'}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => toggleAvailable(it.id, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    {it.itemName}
                    {it.details && <p className="text-xs text-slate-400">{it.details}</p>}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{it.unit || '-'}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{it.demandQty}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isAvailable}
                      value={offeredQty[it.id]}
                      onChange={(e) => setOfferedQty((q) => ({ ...q, [it.id]: e.target.value }))}
                      className="w-24 text-right border border-slate-200 rounded-md px-2 py-1 text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isAvailable}
                      value={rates[it.id]}
                      onChange={(e) => setRates((r) => ({ ...r, [it.id]: e.target.value }))}
                      className="w-28 text-right border border-slate-200 rounded-md px-2 py-1 text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-800">
                    {isAvailable
                      ? `৳${((Number(rates[it.id]) || 0) * (Number(offeredQty[it.id]) || 0)).toLocaleString()}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td colSpan={6} className="px-3 py-2 text-right font-semibold text-slate-700">Quoted Subtotal</td>
              <td className="px-3 py-2 text-right font-bold text-slate-900">৳{subtotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            placeholder="Delivery lead time, terms, etc."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
      >
        <Send size={14} />
        {submitting ? 'Submitting…' : 'Submit Response'}
      </button>
    </form>
  );
}

export default function PortalMaterialRequisitionView() {
  const { id } = useParams();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    getPortalMaterialRequisition(id)
      .then(setReq)
      .catch(() => setError('Could not load this requisition.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const myQuotation = req?.quotations?.[0];
  const canRespond = req?.status === 'Open' && (!myQuotation || myQuotation.status === 'NeedsCorrection');

  return (
    <PortalLayout>
      <Link to="/portal/material-requisitions" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to requisitions
      </Link>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {req && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{req.code}</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {req.titleOfWork || 'Material Requisition'}
              </h1>
            </div>
            <StatusBadge status={req.status} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Date</p>
                  <p className="text-sm text-slate-800">{req.date || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Demand Date</p>
                  <p className="text-sm text-slate-800">{req.demandDate || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Tag size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Project</p>
                  <p className="text-sm text-slate-800">{req.project?.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Site</p>
                  <p className="text-sm text-slate-800">{req.site?.name || '-'}</p>
                </div>
              </div>
              {req.reference && (
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <FileText size={15} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Reference</p>
                    <p className="text-sm text-slate-800">{req.reference}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-800">Requested Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Item</th>
                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Demand Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(req.items || []).length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-sm">No items on this requisition</td></tr>
                  ) : req.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{it.itemName}</p>
                        {it.details && <p className="text-xs text-slate-400">{it.details}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{it.unit || '-'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{it.demandQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canRespond && (
            <QuotationForm
              requisition={req}
              correctionNote={myQuotation?.status === 'NeedsCorrection' ? myQuotation.correctionNote : null}
              onSubmitted={load}
            />
          )}

          {myQuotation && myQuotation.status !== 'NeedsCorrection' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Your Response
                </h2>
                <StatusBadge status={myQuotation.status} />
              </div>
              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px]">
                    <th className="text-left py-1">Item</th>
                    <th className="text-left py-1">Available</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(myQuotation.items || []).map((it) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-700">{it.itemName}</td>
                      <td className="py-1.5 text-slate-600">{it.available === false ? 'No' : 'Yes'}</td>
                      <td className="py-1.5 text-right text-slate-600">{it.available === false ? '—' : it.offeredQty}</td>
                      <td className="py-1.5 text-right text-slate-600">{it.available === false ? '—' : `৳${Number(it.quotedRate).toLocaleString()}`}</td>
                      <td className="py-1.5 text-right font-medium text-slate-800">{it.available === false ? '—' : `৳${Number(it.quotedAmount).toLocaleString()}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Subtotal</p>
                  <p className="font-semibold text-slate-800">৳{Number(myQuotation.subtotal || 0).toLocaleString()}</p>
                </div>
                {myQuotation.validUntil && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Valid Until</p>
                    <p className="text-slate-800">{myQuotation.validUntil}</p>
                  </div>
                )}
                {myQuotation.notes && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-slate-400 mb-0.5">Notes</p>
                    <p className="text-slate-800">{myQuotation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {req.convertedToPurchaseOrder && (
            <Link
              to={`/portal/orders/${req.convertedToPurchaseOrder.id}`}
              className="flex items-center justify-between bg-slate-900 text-white rounded-2xl px-5 py-4 hover:bg-slate-800 transition-colors"
            >
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Converted to Purchase Order</p>
                <p className="font-mono text-sm">{req.convertedToPurchaseOrder.code}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                Manage Order <ExternalLink size={14} />
              </span>
            </Link>
          )}
        </>
      )}
    </PortalLayout>
  );
}