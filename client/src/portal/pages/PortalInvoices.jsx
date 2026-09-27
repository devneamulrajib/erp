import { useEffect, useState } from 'react';
import { Receipt, Download } from 'lucide-react';
import { getPortalBills, downloadPortalBillPdf } from '../api/portalBills';
import { getPortalSupplierInvoices, downloadInvoice } from '../api/portalPurchaseOrders';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Overdue: 'bg-red-50 text-red-600 ring-red-600/10',
    Partial: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Unpaid: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Invoices</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {isSupplier ? 'Invoices generated from your delivered orders' : 'Your billing history and payment status'}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <Receipt size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">All Invoices</h2>
        </div>
        <div className="overflow-x-auto">
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
              {loading ? (
                <tr><td colSpan={isSupplier ? 7 : 6} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={isSupplier ? 7 : 6} className="text-center py-10 text-slate-400 text-sm">No invoices yet</td></tr>
              ) : bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.code}</td>
                  {isSupplier && (
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.purchaseOrderCode || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{b.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{Number(b.grandTotal || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{Number(b.due || 0).toLocaleString()}</td>
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
      </div>
    </PortalLayout>
  );
}