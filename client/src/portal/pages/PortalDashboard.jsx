import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, ArrowRight, ShoppingCart, Clock, FileCheck2,
  MessageSquarePlus, CreditCard, FileBarChart, LifeBuoy,
  Receipt, CheckCircle2,
} from 'lucide-react';
import { getPortalDashboard } from '../api/portalDashboard';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

function invoiceStatus(inv) {
  const due = Number(inv.due || 0);
  const paid = Number(inv.paid || 0);
  if (due === 0 && paid > 0) return { label: 'Settled', tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, iconTone: 'bg-emerald-100 text-emerald-600' };
  if (paid > 0) return { label: 'Partial', tone: 'bg-amber-100 text-amber-700', icon: Receipt, iconTone: 'bg-amber-100 text-amber-600' };
  return { label: 'Unpaid', tone: 'bg-slate-100 text-slate-600', icon: Receipt, iconTone: 'bg-slate-100 text-slate-500' };
}

function VelocityCard({ label, value, icon, footer, to }) {
  return (
    <Link
      to={to}
      className="block bg-white border border-slate-200 rounded-xl p-3 md:p-4 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-slate-900 leading-none mb-1.5">{value}</p>
      {footer}
    </Link>
  );
}

function QuickAction({ icon, label, to }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 group">
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
        {icon}
      </div>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
    </Link>
  );
}

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
  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  // Card routing differs by role: for a customer, "Orders" really means
  // their bill/invoice count, so it points at Invoices; for a supplier it
  // means actual Purchase Orders.
  const ordersTo = isSupplierOrVendor ? '/portal/orders' : '/portal/invoices';
  const requestsTo = isSupplierOrVendor ? '/portal/material-requisitions' : '/portal/requests';
  const quotesTo = isSupplierOrVendor ? '/portal/orders' : '/portal/quotes';

  // Grouped by date for the "Today / Yesterday"-style sectioned list.
  const invoiceGroups = {};
  (data?.recentInvoices || []).forEach((inv) => {
    (invoiceGroups[inv.date] = invoiceGroups[inv.date] || []).push(inv);
  });
  const sortedDates = Object.keys(invoiceGroups).sort((a, b) => (a < b ? 1 : -1));

  return (
    <PortalLayout>
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
          Loading your dashboard…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
      )}

      {data && (
        <>
          {/* Date + welcome */}
          <p className="text-xs font-medium text-slate-400 mb-1">{todayLabel}</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-1">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-400 mb-5 md:mb-6">Here's your account overview</p>

          {/* Desktop: balance + activity side by side. Mobile: stacked, original order. */}
          <div className="md:grid md:grid-cols-3 md:gap-6 md:items-start">
            {/* Outstanding balance card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-5 md:mb-0 md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Wallet size={13} />
                  <p className="text-[11px] font-semibold uppercase tracking-wide">Outstanding Balance</p>
                </div>
              </div>

              <p className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
                ৳{Number(data.cards.outstandingBalance || 0).toLocaleString()}
              </p>

              <div className="flex items-center gap-2">
                <Link
                  to="/portal/invoices"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
                >
                  View Invoices <ArrowRight size={14} />
                </Link>
              </div>

              {/* Quick actions live inside this card on desktop, matching its width */}
              <div className="hidden md:grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-slate-100">
                <QuickAction icon={<MessageSquarePlus size={17} />} label="New Req" to="/portal/requests" />
                <QuickAction icon={<CreditCard size={17} />} label="Invoices" to="/portal/invoices" />
                <QuickAction icon={<FileBarChart size={17} />} label="Quotes" to="/portal/quotes" />
                <QuickAction icon={<LifeBuoy size={17} />} label="Support" to="/portal/requests" />
              </div>
            </div>

            {/* Operational Velocity */}
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-slate-800 mb-2.5">Account Activity</p>
              <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-5 md:mb-0">
                <VelocityCard
                  label="Orders"
                  value={data.cards.totalOrders}
                  icon={<ShoppingCart size={14} />}
                  to={ordersTo}
                />
                <VelocityCard
                  label="Requests"
                  value={data.cards.pendingRequests}
                  icon={<Clock size={14} />}
                  to={requestsTo}
                  footer={data.cards.pendingRequests > 0 ? (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">Pending</span>
                  ) : null}
                />
                <VelocityCard
                  label="Quotes"
                  value={data.cards.pendingQuotations}
                  icon={<FileCheck2 size={14} />}
                  to={quotesTo}
                />
              </div>

              {/* Quick actions — mobile only here; desktop version lives in the balance card above */}
              <div className="grid grid-cols-4 gap-2 mb-6 md:hidden">
                <QuickAction icon={<MessageSquarePlus size={17} />} label="New Req" to="/portal/requests" />
                <QuickAction icon={<CreditCard size={17} />} label="Invoices" to="/portal/invoices" />
                <QuickAction icon={<FileBarChart size={17} />} label="Quotes" to="/portal/quotes" />
                <QuickAction icon={<LifeBuoy size={17} />} label="Support" to="/portal/requests" />
              </div>
            </div>
          </div>

          {/* Recent invoices + recent requests — stacked on mobile, side by side on desktop */}
          <div className="md:grid md:grid-cols-2 md:gap-6 md:mt-6">
            {/* Recent invoices — now shown for suppliers too, since the backend joins through their POs */}
            <div className="mb-6 md:mb-0 bg-white md:border md:border-slate-200 md:rounded-2xl md:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Recent Invoices <span className="text-slate-400 font-normal">{data.recentInvoices.length}</span>
                </p>
                <Link to="/portal/invoices" className="text-xs text-slate-500 hover:text-slate-800 font-medium">View all</Link>
              </div>

              {sortedDates.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No invoices yet</p>
              ) : sortedDates.map((date) => (
                <div key={date} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{date}</p>
                  <div className="space-y-2.5">
                    {invoiceGroups[date].map((inv) => {
                      const status = invoiceStatus(inv);
                      const StatusIcon = status.icon;
                      return (
                        <div key={inv.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${status.iconTone}`}>
                              <StatusIcon size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-slate-800 truncate">{inv.code}</p>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${status.tone}`}>
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">Paid ৳{Number(inv.paid || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-900 shrink-0">৳{Number(inv.due || 0).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent requests */}
            <div className="bg-white md:border md:border-slate-200 md:rounded-2xl md:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Recent Requests <span className="text-slate-400 font-normal">{data.recentRequests.length}</span>
                </p>
                <Link
                  to={isSupplierOrVendor ? '/portal/material-requisitions' : '/portal/requests'}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  View all
                </Link>
              </div>
              {data.recentRequests.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No requests yet</p>
              ) : (
                <div className="space-y-2.5">
                  {data.recentRequests.map((r) => (
                    <Link
                      key={r.id}
                      to={isSupplierOrVendor ? `/portal/material-requisitions/${r.id}` : '/portal/requests'}
                      className="flex items-center justify-between hover:bg-slate-50 rounded-lg -mx-2 px-2 py-1.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {r.subject || r.titleOfWork || 'Material Requisition'}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{r.code}</p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 rounded px-2 py-1 shrink-0">
                        {r.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  );
}