import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, Send } from 'lucide-react';
import { getPortalMaterialRequisitions } from '../api/portalMaterialRequisitions';
import { usePortalNotifications } from '../context/PortalNotificationsContext';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Open: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    PartiallyConverted: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Converted: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

function PortalMaterialRequisitionsPageInner() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { unreadRelatedKeys } = usePortalNotifications();

  useEffect(() => {
    getPortalMaterialRequisitions()
      .then(setRequisitions)
      .catch(() => setRequisitions([]))
      .finally(() => setLoading(false));
  }, []);

  const openCount = requisitions.filter((r) => r.status === 'Open').length;

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Material Requisitions</h1>
        <p className="text-sm text-slate-500 mt-0.5">Requisitions sent to you for materials</p>
      </div>

      {!loading && requisitions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Total Requisitions</p>
            <p className="text-2xl font-semibold text-slate-900">{requisitions.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Awaiting Response</p>
            <p className="text-2xl font-semibold text-amber-600">{openCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hidden sm:block">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Converted</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {requisitions.filter((r) => r.status === 'Converted').length}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <ClipboardList size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">All Requisitions</h2>
        </div>
        <div className="overflow-x-auto">
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
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ClipboardList size={28} strokeWidth={1.5} />
                      <p className="text-sm">No requisitions yet</p>
                      <p className="text-xs text-slate-400">New requests will appear here as they come in.</p>
                    </div>
                  </td>
                </tr>
              ) : requisitions.map((r) => {
                const myQuotation = (r.quotations || [])[0];
                const needsResponse = r.status === 'Open' && (!myQuotation || myQuotation.status === 'NeedsCorrection');
                const hasUnreadUpdate = unreadRelatedKeys.has(`MaterialRequisition:${r.id}`)
                  || unreadRelatedKeys.has(`PurchaseOrder:${r.convertedToPurchaseOrderId}`);
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
                    <td className="px-4 py-3.5 text-slate-500">{r.date || '-'}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                      ৳{Number(r.subtotal || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/portal/material-requisitions/${r.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                          needsResponse
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600'
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

export default function PortalMaterialRequisitionsPage() {
  return <PortalMaterialRequisitionsPageInner />;
}