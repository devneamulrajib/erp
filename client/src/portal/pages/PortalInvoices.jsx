import { useEffect, useState } from 'react';
import { getPortalBills, downloadPortalBillPdf } from '../api/portalBills';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

export default function PortalInvoices() {
  const user = getPortalUser();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    getPortalBills().then(setBills).catch(() => setBills([])).finally(() => setLoading(false));
  }, []);

  async function handleDownload(bill) {
    setDownloadingId(bill.id);
    try {
      await downloadPortalBillPdf(bill.id, `Invoice-${bill.code}.pdf`);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  }

  if (user?.role !== 'customer') {
    return <PortalLayout><p className="text-sm text-slate-500">Invoices are only available for customer accounts.</p></PortalLayout>;
  }

  return (
    <PortalLayout>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Invoices</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Grand Total</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No invoices yet</td></tr>
            ) : bills.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs">{b.code}</td>
                <td className="px-4 py-3">{b.date}</td>
                <td className="px-4 py-3">{b.status}</td>
                <td className="px-4 py-3 text-right">{Number(b.grandTotal || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600">{Number(b.due || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDownload(b)}
                    disabled={downloadingId === b.id}
                    className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {downloadingId === b.id ? 'Downloading…' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}