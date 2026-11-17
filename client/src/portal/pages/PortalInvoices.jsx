import { useEffect, useState } from 'react';
import { Receipt, Download, CalendarDays } from 'lucide-react';
import { getPortalBills, downloadPortalBillPdf } from '../api/portalBills';
import { getPortalSupplierInvoices, downloadInvoice } from '../api/portalPurchaseOrders';
import { getPortalUser } from '../api/portalAuth';
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

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Overdue: 'bg-red-50 text-red-600 ring-red-600/10',
    Partial: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Unpaid: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalInvoices() {
  const user = getPortalUser();
  const isSupplier = user?.role === 'supplier' || user?.role === 'vendor';
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const loader = isSupplier ? getPortalSupplierInvoices : getPortalBills;
    loader().then(setBills).catch(() => setBills([])).finally(() => setLoading(false));
  }, [isSupplier]);

  async function handleDownload(bill) {
    setDownloadingId(bill.id);
    try {
      if (isSupplier) {
        await downloadInvoice(bill.purchaseOrderId);
      } else {
        await downloadPortalBillPdf(bill.id, `Invoice-${bill.code}.pdf`);
      }
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <PortalLayout>
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">Invoices</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {isSupplier ? 'Invoices generated from your delivered orders' : 'Your billing history and payment status'}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 bg-slate-50/50">
          <Receipt size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">All Invoices</h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No invoices yet</div>
        ) : (
          <>
            {/* Mobile / app view: one card per invoice, no sideways scrolling */}
            <div className="md:hidden divide-y divide-slate-100">
              {bills.map((b) => (
                <div key={b.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-700 break-all min-w-0">{b.code}</span>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <CalendarDays size={13} className="text-slate-400" />
                      {shortDate(b.date)}
                    </span>
                    {isSupplier && (
                      <span className="font-mono truncate">Order {b.purchaseOrderCode || '-'}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Grand Total</p>
                      <p className="text-sm font-semibold text-slate-900">{money(b.grandTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Due</p>
                      <p className={`text-sm font-semibold ${Number(b.due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {money(b.due)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(b)}
                    disabled={downloadingId === b.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
                  >
                    <Download size={14} />
                    {downloadingId === b.id ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop view: original table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    {isSupplier && <th className="px-4 py-3 text-left font-medium">Order</th>}
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Grand Total</th>
                    <th className="px-4 py-3 text-right font-medium">Due</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.code}</td>
                      {isSupplier && (
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.purchaseOrderCode || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{shortDate(b.date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{money(b.grandTotal)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{money(b.due)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDownload(b)}
                          disabled={downloadingId === b.id}
                          className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-xs font-medium disabled:opacity-50 transition-colors"
                        >
                          <Download size={12} />
                          {downloadingId === b.id ? 'Downloading…' : 'Download PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}