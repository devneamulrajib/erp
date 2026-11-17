import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, ExternalLink, Pencil } from 'lucide-react';
import { getPortalMaterialRequisition, submitQuotation } from '../api/portalMaterialRequisitions';
import PortalLayout from '../components/PortalLayout';
import CorrectionAlert from '../components/CorrectionAlert';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 2026-11-15 (or any date string) -> "15 Nov 26"
function shortDate(value) {
  if (!value) return '-';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

const STATUS_STYLES = {
  Open: 'bg-sky-50 text-sky-600 ring-sky-600/10',
  PartiallyConverted: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  Converted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  Submitted: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
  Accepted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
  NeedsCorrection: 'bg-amber-100 text-amber-700 ring-amber-600/30',
};

const STATUS_LABELS = {
  NeedsCorrection: 'Correction Requested',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${cls}`}>
      {STATUS_LABELS[status] || status || '-'}
    </span>
  );
}

function Meta({ label, value, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 truncate">{value || '-'}</p>
    </div>
  );
}

// initialQuotation: pass the supplier's existing response to edit it (form is pre-filled).
// onCancel: when provided, a Cancel button is shown (used in edit mode).
function QuotationForm({ requisition, initialQuotation, onSubmitted, onCancel }) {
  const isEdit = Boolean(initialQuotation);
  const prior = Object.fromEntries(
    (initialQuotation?.items || []).map((q) => [q.materialRequisitionItemId, q])
  );

  const [available, setAvailable] = useState(() =>
    Object.fromEntries(
      requisition.items.map((it) => [it.id, prior[it.id] ? prior[it.id].available !== false : true])
    )
  );
  const [offeredQty, setOfferedQty] = useState(() =>
    Object.fromEntries(
      requisition.items.map((it) => [
        it.id,
        prior[it.id] && prior[it.id].available !== false ? prior[it.id].offeredQty : it.demandQty,
      ])
    )
  );
  const [rates, setRates] = useState(() =>
    Object.fromEntries(
      requisition.items.map((it) => [
        it.id,
        prior[it.id] && prior[it.id].available !== false ? String(Number(prior[it.id].quotedRate) || '') : '',
      ])
    )
  );
  const [validUntil, setValidUntil] = useState(initialQuotation?.validUntil || '');
  const [notes, setNotes] = useState(initialQuotation?.notes || '');
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

  const inputCls =
    'w-full min-w-0 text-right border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

  return (
    <form
      id="response-form"
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 scroll-mt-4"
    >
      <h2 className="text-sm font-semibold text-slate-800">
        {isEdit ? 'Edit Your Response' : 'Respond to This Requisition'}
      </h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">
        {isEdit
          ? 'Update your items, qty and rate, then save.'
          : 'Tick each item you can supply, then enter qty and rate.'}
      </p>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="space-y-2.5 mb-3">
        {requisition.items.map((it) => {
          const isAvailable = !!available[it.id];
          const amount = (Number(rates[it.id]) || 0) * (Number(offeredQty[it.id]) || 0);
          return (
            <div
              key={it.id}
              className={`rounded-xl border p-3 ${isAvailable ? 'border-slate-200' : 'border-slate-100 bg-slate-50'}`}
            >
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => toggleAvailable(it.id, e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium break-words ${isAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
                    {it.itemName}
                  </span>
                  {it.details && <span className="block text-xs text-slate-400 break-words">{it.details}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-500 whitespace-nowrap">
                  Req: {it.demandQty} {it.unit || ''}
                </span>
              </label>

              {isAvailable && (
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Your Qty</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={offeredQty[it.id]}
                      onChange={(e) => setOfferedQty((q) => ({ ...q, [it.id]: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Your Rate</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={rates[it.id]}
                      onChange={(e) => setRates((r) => ({ ...r, [it.id]: e.target.value }))}
                      className={inputCls}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 text-right">Amount</p>
                    <p className="h-[34px] flex items-center justify-end text-sm font-semibold text-slate-800">
                      ৳{amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-3">
        <span className="text-sm font-semibold text-slate-700">Quoted Subtotal</span>
        <span className="text-base font-bold text-slate-900">৳{subtotal.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="min-w-0">
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-w-0 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            placeholder="Lead time, terms…"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
          {submitting ? (isEdit ? 'Saving…' : 'Submitting…') : isEdit ? 'Save Changes' : 'Submit Response'}
        </button>
      </div>
    </form>
  );
}

export default function PortalMaterialRequisitionView() {
  const { id } = useParams();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  function load() {
    getPortalMaterialRequisition(id)
      .then(setReq)
      .catch(() => setError('Could not load this requisition.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const myQuotation = req?.quotations?.[0];
  const needsCorrection = req?.status === 'Open' && myQuotation?.status === 'NeedsCorrection';
  const canRespond = req?.status === 'Open' && (!myQuotation || needsCorrection);
  // A submitted response can still be edited while the requisition is open
  const canEdit = req?.status === 'Open' && myQuotation?.status === 'Submitted';
  const showForm = canRespond || (canEdit && editing);
  const headerStatus = needsCorrection ? 'NeedsCorrection' : req?.status;

  function handleSubmitted() {
    setEditing(false);
    load();
  }

  return (
    <PortalLayout>
      <Link
        to="/portal/material-requisitions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-3"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">Loading…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {req && (
        <>
          {/* Compact header: code, status, title and key details in one card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs text-slate-400">{req.code}</span>
              <StatusBadge status={headerStatus} />
            </div>
            <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight break-words">
              {req.titleOfWork || 'Material Requisition'}
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100">
              <Meta label="Date" value={shortDate(req.date)} />
              <Meta label="Demand Date" value={shortDate(req.demandDate)} />
              <Meta label="Project" value={req.project?.name} />
              <Meta label="Site" value={req.site?.name} />
              {req.reference && <Meta label="Reference" value={req.reference} className="col-span-2 md:col-span-4" />}
            </div>
          </div>

          {/* Eye-catching correction alert, directly under the details card */}
          {needsCorrection && (
            <div className="mb-4">
              <CorrectionAlert note={myQuotation.correctionNote} targetId="response-form" />
            </div>
          )}

          {/* While the form is open it already shows each requested qty, so list items only otherwise */}
          {!showForm && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-800">Requested Items</h2>
              </div>
              {(req.items || []).length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No items on this requisition</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {req.items.map((it) => (
                    <li key={it.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 break-words">{it.itemName}</p>
                        {it.details && <p className="text-xs text-slate-400 break-words">{it.details}</p>}
                      </div>
                      <p className="shrink-0 text-sm text-slate-600 whitespace-nowrap">
                        {it.demandQty} {it.unit || ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showForm && (
            <QuotationForm
              requisition={req}
              initialQuotation={myQuotation || null}
              onSubmitted={handleSubmitted}
              onCancel={editing ? () => setEditing(false) : undefined}
            />
          )}

          {!showForm && myQuotation && myQuotation.status !== 'NeedsCorrection' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Your Response
                </h2>
                <div className="flex items-center gap-2">
                  <StatusBadge status={myQuotation.status} />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-slate-100 mb-3">
                {(myQuotation.items || []).map((it) => {
                  const isAvailable = it.available !== false;
                  return (
                    <li key={it.id} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 break-words">{it.itemName}</p>
                        <p className="text-xs text-slate-500">
                          {isAvailable
                            ? `${it.offeredQty} × ৳${Number(it.quotedRate).toLocaleString()}`
                            : 'Not available'}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-slate-800">
                        {isAvailable ? `৳${Number(it.quotedAmount).toLocaleString()}` : '—'}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-slate-100">
                <Meta label="Subtotal" value={`৳${Number(myQuotation.subtotal || 0).toLocaleString()}`} />
                {myQuotation.validUntil && <Meta label="Valid Until" value={shortDate(myQuotation.validUntil)} />}
                {myQuotation.notes && <Meta label="Notes" value={myQuotation.notes} className="col-span-2" />}
              </div>
            </div>
          )}

          {req.convertedToPurchaseOrder && (
            <Link
              to={`/portal/orders/${req.convertedToPurchaseOrder.id}`}
              className="flex items-center justify-between bg-slate-900 text-white rounded-2xl px-4 py-3.5 hover:bg-slate-800 transition-colors"
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