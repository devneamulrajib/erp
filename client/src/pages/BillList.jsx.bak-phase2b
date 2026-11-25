import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, deleteBill, updateBillStatus, downloadBillPdf, sendBillEmail, getBillAttachmentUrl } from '../api/bill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle, FileSpreadsheet, FileText, LayoutGrid, Eye, Pencil, Trash2, Download, Mail, X, Loader2 } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function getId(row) { return row?.id ?? row?._id; }

const STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue', 'Cancelled'];
const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-600 ring-slate-300',
  Sent: 'bg-blue-50 text-blue-600 ring-blue-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'Partially Paid': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Unpaid: 'bg-red-50 text-red-600 ring-red-600/20',
  Overdue: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  Cancelled: 'bg-slate-100 text-slate-400 ring-slate-300',
};

export default function BillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [emailRow, setEmailRow] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getBills({ from, to });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load bills');
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this bill?')) return;
    const rowId = getId(row);
    try {
      await deleteBill(rowId);
      setRows((prev) => prev.filter((r) => getId(r) !== rowId));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  async function handleStatusChange(row, status) {
    const rowId = getId(row);
    const prevStatus = row.status;
    setRows((prev) => prev.map((r) => (getId(r) === rowId ? { ...r, status } : r)));
    try {
      await updateBillStatus(rowId, status);
    } catch (e) {
      setRows((prev) => prev.map((r) => (getId(r) === rowId ? { ...r, status: prevStatus } : r)));
      alert(e.response?.data?.message || e.message || 'Failed to update status');
    }
  }

  async function handleDownload(row) {
    const rowId = getId(row);
    setDownloadingId(rowId);
    try {
      await downloadBillPdf(rowId, `Invoice-${row.code}.pdf`);
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  }

  function exportCsv() {
    const header = ['ID', 'Customer', 'Code', 'Date', 'Grand Total', 'Paid', 'Due', 'Status'];
    const lines = filtered.map((r, i) => [
      i + 1,
      r.Customer?.name || r.customer?.name || '',
      r.code || '', r.date || '',
      num(r.grandTotal), num(r.paid), num(r.due),
      r.status || (num(r.due) <= 0 ? 'Paid' : 'Unpaid'),
    ]);
    const csv = [header, ...lines].map((l) => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bills.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = r.Customer?.name || r.customer?.name || '';
    return [r.code, r.refWoNo, name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Billing', to: '/billing/bill_list' },
              { label: 'Invoice/Bill List' },
            ]} />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Invoice / Bill List</h1>
            <p className="text-sm text-slate-500 mt-0.5">View and manage all bills and invoices</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/billing/bill')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors">
              <PlusCircle size={16} /> New Bill/Invoice
            </button>
            <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              Back
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

        {/* Date filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Bills', value: rows.length, color: 'text-slate-900' },
            { label: 'Grand Total', value: filtered.reduce((s, r) => s + num(r.grandTotal), 0).toLocaleString(), color: 'text-slate-900' },
            { label: 'Total Paid', value: filtered.reduce((s, r) => s + num(r.paid), 0).toLocaleString(), color: 'text-emerald-600' },
            { label: 'Total Due', value: filtered.reduce((s, r) => s + num(r.due), 0).toLocaleString(), color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{s.label}</div>
              <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button onClick={exportCsv}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500 ml-2">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, customer..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['#', 'Customer', 'Code', 'Date', 'Grand Total', 'Paid', 'Due', 'Status', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-16 text-slate-400">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No bills found.</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((row, i) => {
                  const rowId = getId(row);
                  const customerName = row.Customer?.name || row.customer?.name || '—';
                  const status = row.status || (num(row.due) <= 0 ? 'Paid' : 'Unpaid');
                  const attachmentUrl = getBillAttachmentUrl(row.attachment);
                  return (
                    <tr key={rowId} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{customerName}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{row.date || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-emerald-600 font-medium">{num(row.paid).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-red-500 font-medium">{num(row.due).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(row, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2.5 py-1 ring-1 ring-inset border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${STATUS_STYLES[status] || STATUS_STYLES.Unpaid}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {attachmentUrl
                          ? <a href={attachmentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-medium">View File</a>
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/billing/bill/${rowId}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 transition-colors"
                            title="View / Edit"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/billing/bill/${rowId}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(row)}
                            disabled={downloadingId === rowId}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-500 transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingId === rowId ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          <button
                            onClick={() => setEmailRow(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Email Invoice"
                          >
                            <Mail size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {n}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {emailRow && (
        <EmailModal
          row={emailRow}
          onClose={() => setEmailRow(null)}
        />
      )}
    </div>
  );
}

function EmailModal({ row, onClose }) {
  const [to, setTo] = useState(row.Customer?.email || row.customer?.email || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!to.trim()) { setError('Recipient email is required'); return; }
    setSending(true); setError('');
    try {
      await sendBillEmail(getId(row), to.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Email Invoice</h2>
        <p className="text-sm text-slate-500 mb-4">Send {row.code} as a PDF attachment.</p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
            Invoice sent to {to}.
          </div>
        ) : (
          <form onSubmit={handleSend}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}