import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPeriodBills, getPeriodBill, deletePeriodBill } from '../api/periodBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { PlusCircle, Search, LayoutGrid, Paperclip, Pencil, Eye, FileDown, Trash2, X } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function rid(o) { return o?.id ?? o?._id ?? ''; }

export default function PeriodBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [viewError, setViewError] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPeriodBills();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load period bills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this period bill?')) return;
    try {
      await deletePeriodBill(rid(row));
      setRows((prev) => prev.filter((r) => rid(r) !== rid(row)));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  async function handleView(row) {
    setViewOpen(true);
    setViewLoading(true);
    setViewError('');
    setViewBill(null);
    try {
      const full = await getPeriodBill(rid(row));
      setViewBill(full);
    } catch (e) {
      setViewError(e.response?.data?.message || e.message || 'Failed to load bill details');
    } finally {
      setViewLoading(false);
    }
  }

  function closeView() {
    setViewOpen(false);
    setViewBill(null);
    setViewError('');
  }

  function handlePdf(row) {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = '<html><head><title>Period Bill ' + row.code + '</title></head>' +
      '<body style="font-family: sans-serif; padding: 24px;">' +
      '<h2>Period Bill - ' + row.code + '</h2>' +
      '<table style="border-collapse: collapse; width: 100%;"><tbody>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Customer</td><td style="padding:6px 12px;">' + (row.customer?.name || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Project</td><td style="padding:6px 12px;">' + (row.project?.name || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Ref</td><td style="padding:6px 12px;">' + (row.refWoNo || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Date</td><td style="padding:6px 12px;">' + (row.date || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Start Date</td><td style="padding:6px 12px;">' + (row.startDate || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">End Date</td><td style="padding:6px 12px;">' + (row.endDate || '-') + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Construction Cost</td><td style="padding:6px 12px;">' + num(row.constructionCost).toLocaleString() + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Service Charge</td><td style="padding:6px 12px;">' + num(row.serviceCharge).toLocaleString() + '</td></tr>' +
      '<tr><td style="padding:6px 12px;font-weight:600;">Added By</td><td style="padding:6px 12px;">' + (row.addedBy || '-') + '</td></tr>' +
      '</tbody></table></body></html>';
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.customer?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const HEADERS = ['ID', 'Project', 'Customer Name', 'Code', 'Ref', 'Date', 'Start Date', 'End Date', 'Construction Cost', 'Service Charge', 'Added By', 'Attachment', 'Action'];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-full mx-auto px-3 sm:px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <Breadcrumb items={[{ label: 'Home', to: '/dashboard' }, { label: 'Billing', to: '/billing/percentage_bill_list' }, { label: 'Period Bill List' }]} />
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Period Bills</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage periodic construction billing for projects</p>
          </div>
          <button onClick={() => navigate('/billing/period-bill-add')} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors shrink-0">
            <PlusCircle size={16} strokeWidth={2.5} />
            New Period Billing
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 max-w-xl">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Bills</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{paged.length} / {filtered.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">Excel</button>
              <button onClick={() => window.print()} className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">PDF</button>
              <div className="flex items-center gap-2 text-sm text-slate-500 ml-1">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search period bills..." className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-56 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {HEADERS.map((h) => (
                    <th key={h} className={h === 'Action' ? 'px-3 py-2.5 font-medium text-[11px] uppercase tracking-wide text-right' : 'px-3 py-2.5 font-medium text-[11px] uppercase tracking-wide text-left'}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-14 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={26} strokeWidth={1.5} />
                        <p className="text-sm">No period bills found. Try adjusting your search, or create one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={rid(row)} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top text-xs sm:text-sm">
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{'#' + ((page - 1) * pageSize + i + 1)}</td>
                      <td className="px-3 py-3 text-slate-600">{row.project?.name || '-'}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{row.customer?.name || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 text-[11px] font-mono font-medium ring-1 ring-inset ring-indigo-600/10">{row.code}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.refWoNo || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{row.date}</td>
                      <td className="px-3 py-3 text-slate-600">{row.startDate || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{row.endDate || '-'}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{num(row.constructionCost).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-600">{num(row.serviceCharge).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-600">{row.addedBy || '-'}</td>
                      <td className="px-3 py-3">
                        {row.attachment ? <AttachmentLink url={row.attachment} /> : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end items-center gap-1.5">
                          <button onClick={() => navigate('/billing/period-bill-add/' + rid(row))} title="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleView(row)} title="View" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => handlePdf(row)} title="Download PDF" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                            <FileDown size={13} />
                          </button>
                          <button onClick={() => handleDelete(row)} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={n === page ? 'w-9 h-9 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'w-9 h-9 rounded-lg text-sm font-medium transition-colors bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}>
                  {n}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>

      {viewOpen && <ViewModal loading={viewLoading} error={viewError} bill={viewBill} onClose={closeView} />}
    </div>
  );
}

function AttachmentLink({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2">
      <Paperclip size={12} />
      {' File'}
    </a>
  );
}

function ViewModal({ loading, error, bill, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-5 tracking-tight">Period Bill Details</h2>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        ) : bill ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailRow label="Code" value={bill.code} />
            <DetailRow label="Date" value={bill.date} />
            <DetailRow label="Customer" value={bill.customer?.name} />
            <DetailRow label="Project" value={bill.project?.name} />
            <DetailRow label="Site" value={bill.site?.name} />
            <DetailRow label="Ledger" value={bill.ledger?.name} />
            <DetailRow label="Ref W/O No." value={bill.refWoNo} />
            <DetailRow label="Start Date" value={bill.startDate} />
            <DetailRow label="End Date" value={bill.endDate} />
            <DetailRow label="Added By" value={bill.addedBy} />
            <DetailRow label="Project Cost" value={Number(bill.projectCost || 0).toLocaleString()} />
            <DetailRow label="Percentage" value={(bill.percentage || 0) + '%'} />
            <DetailRow label="Construction Cost" value={Number(bill.constructionCost || 0).toLocaleString()} />
            <DetailRow label="Service Charge" value={Number(bill.serviceCharge || 0).toLocaleString()} />
            <DetailRow label="Grand Total" value={Number(bill.grandTotal || 0).toLocaleString()} highlight />

            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Attachment</div>
              {bill.attachment ? <ModalAttachmentLink url={bill.attachment} /> : <span className="text-sm text-slate-400">-</span>}
            </div>

            {bill.contentBody ? (
              <div className="sm:col-span-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Content Body</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">{bill.contentBody}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end pt-5 mt-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function ModalAttachmentLink({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline font-medium">View file</a>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={highlight ? 'text-sm font-semibold text-indigo-600' : 'text-sm text-slate-700'}>
        {value || value === 0 ? value : '-'}
      </div>
    </div>
  );
}