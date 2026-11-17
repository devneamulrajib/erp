import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, Send, CalendarDays } from 'lucide-react';
import { getPortalMaterialRequisitions } from '../api/portalMaterialRequisitions';
import { usePortalNotifications } from '../context/PortalNotificationsContext';
import PortalLayout from '../components/PortalLayout';

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
  NeedsCorrection: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  PartiallyConverted: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  Converted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
};

const STATUS_LABELS = {
  NeedsCorrection: 'Correction Requested',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${cls}`}>
      {STATUS_LABELS[status] || status || '-'}
    </span>
  );
}

function ActionLink({ id, needsResponse, className = '' }) {
  return (
    <Link
      to={`/portal/material-requisitions/${id}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
        needsResponse
          ? 'bg-amber-500 hover:bg-amber-600 text-white'
          : 'bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600'
      } ${className}`}
    >
      {needsResponse ? <><Send size={12} /> Respond</> : <><Eye size={12} /> View</>}
    </Link>
  );
}

// Rendered INSIDE <PortalLayout>, which is where PortalNotificationsProvider lives.
// The hook must be called from here, not from the component that renders PortalLayout.
function PortalMaterialRequisitionsContent() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { unreadRelatedKeys } = usePortalNotifications();

  useEffect(() => {
    getPortalMaterialRequisitions()
      .then(setRequisitions)
      .catch(() => setRequisitions([]))
      .finally(() => setLoading(false));
  }, []);

  // Shared per-row values so the mobile cards and desktop table stay identical.
  function rowInfo(r) {
    const myQuotation = (r.quotations || [])[0];
    const needsCorrection = r.status === 'Open' && myQuotation?.status === 'NeedsCorrection';
    const needsResponse = r.status === 'Open' && (!myQuotation || needsCorrection);
    const hasUnreadUpdate = unreadRelatedKeys.has(`MaterialRequisition:${r.id}`)
      || unreadRelatedKeys.has(`PurchaseOrder:${r.convertedToPurchaseOrderId}`);
    const displayStatus = needsCorrection ? 'NeedsCorrection' : r.status;
    return { needsResponse, hasUnreadUpdate, displayStatus };
  }

  const awaitingCount = requisitions.filter((r) => rowInfo(r).needsResponse).length;
  const convertedCount = requisitions.filter((r) => r.status === 'Converted').length;

  return (
    <>
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-2xl font-semibold text-slate-900 tracking-tight">Material Requisitions</h1>
        <p className="text-sm text-slate-500 mt-0.5">Requisitions sent to you for materials</p>
      </div>

      {!loading && requisitions.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-5">
            <p className="text-[10px] md:text-xs uppercase tracking-wide text-slate-500 mb-1">Total</p>
            <p className="text-xl md:text-2xl font-semibold text-slate-900">{requisitions.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-5">
            <p className="text-[10px] md:text-xs uppercase tracking-wide text-slate-500 mb-1">Awaiting</p>
            <p className="text-xl md:text-2xl font-semibold text-amber-600">{awaitingCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-5">
            <p className="text-[10px] md:text-xs uppercase tracking-wide text-slate-500 mb-1">Converted</p>
            <p className="text-xl md:text-2xl font-semibold text-emerald-600">{convertedCount}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <ClipboardList size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">All Requisitions</h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : requisitions.length === 0 ? (
          <div className="py-16">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ClipboardList size={28} strokeWidth={1.5} />
              <p className="text-sm">No requisitions yet</p>
              <p className="text-xs text-slate-400">New requests will appear here as they come in.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile / app view: one card per requisition, no sideways scrolling */}
            <div className="md:hidden divide-y divide-slate-100">
              {requisitions.map((r) => {
                const { needsResponse, hasUnreadUpdate, displayStatus } = rowInfo(r);
                return (
                  <div
                    key={r.id}
                    className={`p-4 space-y-2.5 ${hasUnreadUpdate ? 'bg-amber-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 min-w-0">
                        {hasUnreadUpdate && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                        <span className="truncate">{r.code}</span>
                      </span>
                      <StatusBadge status={displayStatus} />
                    </div>

                    <p className="text-sm font-medium text-slate-800 break-words">
                      {r.titleOfWork || 'Untitled requisition'}
                    </p>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 whitespace-nowrap">
                        <CalendarDays size={13} className="text-slate-400" />
                        {shortDate(r.date)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        ৳{Number(r.subtotal || 0).toLocaleString()}
                      </span>
                    </div>

                    <ActionLink id={r.id} needsResponse={needsResponse} className="w-full py-2" />
                  </div>
                );
              })}
            </div>

            {/* Desktop view: original table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Title/Work</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requisitions.map((r) => {
                    const { needsResponse, hasUnreadUpdate, displayStatus } = rowInfo(r);
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          hasUnreadUpdate ? 'bg-amber-50 hover:bg-amber-100/70' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            {hasUnreadUpdate && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                            {r.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{r.titleOfWork || '-'}</td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{shortDate(r.date)}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={displayStatus} /></td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                          ৳{Number(r.subtotal || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ActionLink id={r.id} needsResponse={needsResponse} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function PortalMaterialRequisitionsPage() {
  return (
    <PortalLayout>
      <PortalMaterialRequisitionsContent />
    </PortalLayout>
  );
}