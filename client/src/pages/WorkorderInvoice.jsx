import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getWorkorder } from '../api/workorder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Printer, Download, ArrowLeft } from 'lucide-react';

function num(v) { return Number(v) || 0; }

// Edit these to match your company details
const COMPANY = {
  name: 'TRIKON',
  tagline: 'Business Management',
  address: '123 Business Avenue, Dhaka, Bangladesh',
  phone: '+880 1XXX-XXXXXX',
  email: 'info@trikon.example.com',
};

export default function WorkorderInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef(null);
  const autoPrinted = useRef(false);

  useEffect(() => {
    getWorkorder(id)
      .then(setOrder)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load work order'));
  }, [id]);

  // Auto-trigger print when navigated here with ?print=1 (e.g. from the
  // "Print" action in the Work Order List), once the order has loaded.
  useEffect(() => {
    if (order && searchParams.get('print') === '1' && !autoPrinted.current) {
      autoPrinted.current = true;
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [order, searchParams]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: `Invoice-${order?.code || id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(invoiceRef.current)
        .save();
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <Topbar />
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <Topbar />
        <div className="max-w-3xl mx-auto px-6 py-10 text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          #invoice-print-area { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print">
        <Topbar />
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/workorder_list' },
                { label: 'Invoice' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Invoice</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/billing/workorder_list')}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              <Download size={16} /> {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Printable invoice area */}
        <div id="invoice-print-area" ref={invoiceRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{COMPANY.name}</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{COMPANY.tagline}</p>
              <p className="text-sm text-slate-500 mt-2">{COMPANY.address}</p>
              <p className="text-sm text-slate-500">{COMPANY.phone} · {COMPANY.email}</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">INVOICE</h3>
              <p className="text-sm text-slate-500 mt-1 font-mono">{order.code}</p>
              <p className="text-sm text-slate-500">{order.date}</p>
            </div>
          </div>

          {/* Bill to / meta */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Bill To</p>
              <p className="text-sm font-medium text-slate-900">{order.customer?.name || '-'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Project</p>
              <p className="text-sm text-slate-700">{order.project?.name || '-'}</p>
              {order.site?.name && <p className="text-sm text-slate-500">{order.site.name}</p>}
              {order.clientOrderNo && <p className="text-sm text-slate-500 mt-1">Client Order No: {order.clientOrderNo}</p>}
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-700">
                <th className="text-left py-2 font-semibold">Item</th>
                <th className="text-left py-2 font-semibold">Description</th>
                <th className="text-right py-2 font-semibold">Qty</th>
                <th className="text-right py-2 font-semibold">Unit</th>
                <th className="text-right py-2 font-semibold">Rate</th>
                <th className="text-right py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-800">{it.itemName || '-'}</td>
                  <td className="py-2.5 text-slate-500">{it.description || '-'}</td>
                  <td className="py-2.5 text-right text-slate-700">{it.quantity}</td>
                  <td className="py-2.5 text-right text-slate-700">{it.unit || '-'}</td>
                  <td className="py-2.5 text-right text-slate-700">{num(it.rate).toLocaleString()}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{num(it.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">{num(order.subtotal).toLocaleString()}</span>
              </div>
              {order.vatIncluded && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT ({order.vatPercent}%)</span>
                  <span className="text-slate-900">{num(order.vatAmount).toLocaleString()}</span>
                </div>
              )}
              {order.aitIncluded && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">AIT ({order.aitPercent}%)</span>
                  <span className="text-slate-900">{num(order.aitAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t-2 border-slate-800 pt-2 mt-2">
                <span>Grand Total</span>
                <span>{num(order.grandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-10 border-t border-slate-100 pt-4">
            Added by {order.addedBy || 'Admin'} · Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}