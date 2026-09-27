import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  getMaterialRequisitions,
  getMaterialRequisition,
  deleteMaterialRequisition,
  convertRequisitionToPurchase,
  convertRequisitionToPurchaseOrder,
  convertRequisitionToRfq,
  getRequisitionQuotations,
  acceptRequisitionQuotation,
  rejectRequisitionQuotation,
  requestQuotationCorrection,
} from '../api/materialRequisition';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  PlusCircle, RefreshCw, Search, ClipboardList, Paperclip, X, FileCheck2, Eye, Pencil,
  ShoppingCart, FileText, Send, Trash2, SlidersHorizontal, ChevronDown, ListFilter,
  CheckCircle2, Layers,
} from 'lucide-react';

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

function pendingQuotationCount(row) {
  return (row.quotations || []).filter((q) => q.status === 'Submitted').length;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';

function QuotationReviewModal({ requisition, onClose, onAccepted }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRequisitionQuotations(requisition.id)
      .then(setQuotations)
      .catch(() => setError('Failed to load quotations'))
      .finally(() => setLoading(false));
  }, [requisition.id]);

  async function handleAccept(q) {
    if (!window.confirm(`Accept ${q.supplier?.name || 'this supplier'}'s quotation and convert to a Purchase Order?`)) return;
    setAcceptingId(q.id);
    setError('');
    try {
      await acceptRequisitionQuotation(requisition.id, q.id);
      onAccepted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to accept quotation');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(q) {
    if (!window.confirm(`Reject ${q.supplier?.name || 'this supplier'}'s quotation?`)) return;
    setAcceptingId(q.id);
    setError('');
    try {
      await rejectRequisitionQuotation(requisition.id, q.id);
      setQuotations((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'Rejected' } : x)));
      onAccepted();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reject quotation');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleRequestCorrection(q) {
    const note = window.prompt('What should the supplier correct?');
    if (note === null) return;
    setAcceptingId(q.id);
    setError('');
    try {
      await requestQuotationCorrection(requisition.id, q.id, note);
      setQuotations((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: 'NeedsCorrection', correctionNote: note } : x)));
      onAccepted();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to request correction');
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Supplier Quotations</h2>
        <p className="text-sm text-slate-500 mb-4">{requisition.code} — {requisition.titleOfWork || 'Material Requisition'}</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No quotations submitted yet.</div>
        ) : (
          <div className="space-y-4">
            {quotations.map((q) => (
              <div key={q.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-800">{q.supplier?.name || 'Unknown Supplier'}</p>
                    {q.validUntil && <p className="text-xs text-slate-400">Valid until {q.validUntil}</p>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 ring-emerald-600/10'
                      : q.status === 'Rejected' ? 'bg-red-50 text-red-600 ring-red-600/10'
                      : q.status === 'NeedsCorrection' ? 'bg-amber-50 text-amber-600 ring-amber-600/10'
                      : 'bg-indigo-50 text-indigo-600 ring-indigo-600/10'
                  }`}>
                    {q.status}
                  </span>
                </div>

                <table className="w-full text-xs mb-3">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px]">
                      <th className="text-left py-1">Item</th>
                      <th className="text-left py-1">Available</th>
                      <th className="text-right py-1">Qty</th>
                      <th className="text-right py-1">Rate</th>
                      <th className="text-right py-1">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.items || []).map((it) => (
                      <tr key={it.id} className={`border-t border-slate-100 ${it.available === false ? 'opacity-50' : ''}`}>
                        <td className="py-1.5 text-slate-700">{it.itemName}</td>
                        <td className="py-1.5 text-slate-600">{it.available === false ? 'No' : 'Yes'}</td>
                        <td className="py-1.5 text-right text-slate-600">{it.available === false ? '—' : it.offeredQty}</td>
                        <td className="py-1.5 text-right text-slate-600">{it.available === false ? '—' : `৳${Number(it.quotedRate).toLocaleString()}`}</td>
                        <td className="py-1.5 text-right font-medium text-slate-800">{it.available === false ? '—' : `৳${Number(it.quotedAmount).toLocaleString()}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {q.notes && <p className="text-xs text-slate-500 mb-3">Note: {q.notes}</p>}

                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Subtotal: ৳{Number(q.subtotal).toLocaleString()}</p>
                  {q.status === 'Submitted' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRequestCorrection(q)}
                        disabled={acceptingId === q.id}
                        className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium px-3.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Request Correction
                      </button>
                      <button
                        onClick={() => handleReject(q)}
                        disabled={acceptingId === q.id}
                        className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAccept(q)}
                        disabled={acceptingId === q.id}
                        className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <FileCheck2 size={13} />
                        {acceptingId === q.id ? 'Accepting…' : 'Accept & Convert to PO'}
                      </button>
                    </div>
                  )}
                </div>
                {q.status === 'NeedsCorrection' && q.correctionNote && (
                  <p className="text-xs text-amber-600 mt-2">Correction requested: {q.correctionNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequisitionOverviewModal({ requisitionId, initialRow, onClose, onEdit }) {
  const [data, setData] = useState(initialRow || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMaterialRequisition(requisitionId)
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setError('Failed to load requisition details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requisitionId]);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
  const items = data?.items || [];
  const subtotal = items.reduce((sum, r) => sum + (Number(r.rate) || 0) * (Number(r.demandQty) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
            <Eye size={15} />
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Requisition Overview</h2>
          {data && (() => {
            const st = requisitionStatus(data);
            return <StatusBadge label={st.label} tone={st.tone} />;
          })()}
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-10">
          {(data?.code || initialRow?.code) || '-'} — {(data?.titleOfWork || initialRow?.titleOfWork) || 'Material Requisition'}
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        {loading && !data ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <OverviewField label="Date" value={fmtDate(data?.date)} />
              <OverviewField label="Demand Date" value={fmtDate(data?.demandDate)} />
              <OverviewField label="Company" value={data?.company || '-'} />
              <OverviewField label="Reference" value={data?.reference || '-'} />
              <OverviewField label="Project Type" value={data?.projectType?.name || '-'} />
              <OverviewField label="Project" value={data?.project?.name || '-'} />
              <OverviewField label="Supplier" value={data?.supplier?.name || '-'} />
              <OverviewField label="Site" value={data?.site?.name || '-'} />
              <OverviewField label="Category" value={data?.category?.name || '-'} />
              <OverviewField label="Added By" value={data?.addedBy || '-'} />
              <OverviewField label="Task" value={data?.task || '-'} />
              <OverviewField label="Attachment" value={
                data?.attachment
                  ? <a href={data.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"><Paperclip size={12} /> View file</a>
                  : '-'
              } />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Item</th>
                    <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Unit</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Demand Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Rate</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400">No items on this requisition</td></tr>
                  ) : (
                    items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td className="px-3 py-2 font-medium text-slate-700">{it.itemName}</td>
                        <td className="px-3 py-2 text-slate-600">{it.unit || '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{it.demandQty}</td>
                        <td className="px-3 py-2 text-right text-slate-600">৳{Number(it.rate || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">৳{((Number(it.rate) || 0) * (Number(it.demandQty) || 0)).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">{data?.note ? `Note: ${data.note}` : ''}</p>
              <p className="text-sm font-semibold text-slate-800">Subtotal: ৳{subtotal.toLocaleString()}</p>
            </div>

            {(data?.approvals || []).length > 0 && (
              <div className="mb-5">
                <div className={labelCls}>Approvals</div>
                <div className="flex flex-wrap gap-2">
                  {data.approvals.map((a, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${
                        a.approved ? 'bg-emerald-50 text-emerald-600 ring-emerald-600/10' : 'bg-amber-50 text-amber-600 ring-amber-600/10'
                      }`}
                    >
                      {a.approved ? '✓' : '⏳'} {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Pencil size={14} /> Edit Requisition
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

/* Derives an overall lifecycle status for a requisition from whatever signals
   the row carries. Trusts an explicit backend `status` field if present. */
function requisitionStatus(row) {
  if (row.status) {
    const label = String(row.status);
    const key = label.toLowerCase();
    if (key.includes('reject')) return { label, tone: 'red' };
    if (key.includes('approve') || key.includes('complete') || key.includes('done')) return { label, tone: 'emerald' };
    if (key.includes('convert') || key.includes('order') || key.includes('purchase')) return { label, tone: 'sky' };
    if (key.includes('quotation') || key.includes('rfq')) return { label, tone: 'indigo' };
    if (key.includes('pending') || key.includes('review')) return { label, tone: 'amber' };
    return { label, tone: 'slate' };
  }

  const approvals = row.approvals || [];
  const hasPendingApproval = approvals.length > 0 && !approvals.every((a) => a.approved);
  if (hasPendingApproval) return { label: 'Pending Approval', tone: 'amber' };

  const pendingQuotes = pendingQuotationCount(row);
  if (pendingQuotes > 0) return { label: 'Quotation Review', tone: 'indigo' };

  if (approvals.length > 0 && approvals.every((a) => a.approved)) return { label: 'Approved', tone: 'emerald' };

  return { label: 'Draft', tone: 'slate' };
}

function StatusBadge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
    sky: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    red: 'bg-red-50 text-red-600 ring-red-600/10',
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tones[tone] || tones.slate}`}>
      {label}
    </span>
  );
}

/* Small labeled action button used in the table row actions */
function ActionBtn({ icon: Icon, label, onClick, tone = 'slate', badge, title }) {
  const tones = {
    slate: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
    red: 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200',
  };
  return (
    <button
      onClick={onClick}
      title={title || label}
      className={`relative inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${tones[tone]}`}
    >
      <Icon size={13} />
      {label}
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}

/* Colorful summary stat card */
function StatCard({ icon: Icon, label, value, theme }) {
  const themes = {
    indigo: {
      wrap: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      ring: 'ring-1 ring-indigo-400/40',
      iconWrap: 'bg-white/15 text-white',
      label: 'text-indigo-100',
      value: 'text-white',
    },
    sky: {
      wrap: 'bg-gradient-to-br from-sky-500 to-blue-600',
      ring: 'ring-1 ring-sky-400/40',
      iconWrap: 'bg-white/15 text-white',
      label: 'text-sky-100',
      value: 'text-white',
    },
    amber: {
      wrap: 'bg-gradient-to-br from-amber-400 to-orange-500',
      ring: 'ring-1 ring-amber-300/40',
      iconWrap: 'bg-white/20 text-white',
      label: 'text-amber-50',
      value: 'text-white',
    },
    emerald: {
      wrap: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      ring: 'ring-1 ring-emerald-400/40',
      iconWrap: 'bg-white/15 text-white',
      label: 'text-emerald-100',
      value: 'text-white',
    },
  };
  const t = themes[theme] || themes.indigo;
  return (
    <div className={`relative overflow-hidden rounded-2xl ${t.wrap} ${t.ring} px-4 py-3.5 shadow-sm`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.iconWrap}`}>
          <Icon size={18} strokeWidth={2.25} />
        </div>
        <div>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${t.label}`}>{label}</div>
          <div className={`text-xl font-semibold leading-tight ${t.value}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function MaterialRequisitionList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [reviewingRow, setReviewingRow] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [company, setCompany] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(
    () => [from, to, company, filterSupplier, filterProject].filter(Boolean).length,
    [from, to, company, filterSupplier, filterProject]
  );

  function clearFilters() {
    setFrom('');
    setTo('');
    setCompany('');
    setFilterSupplier('');
    setFilterProject('');
  }

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMaterialRequisitions({
        from, to, company, supplier: filterSupplier, project: filterProject,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  }, [from, to, company, filterSupplier, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/customers').then((res) => setSuppliers(asArray(res))).catch(() => {});
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(asArray(res))).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  // Auto-open the review modal when arriving via a notification link like
  // /requisition-module/material-requisition-list?reviewId=665
  useEffect(() => {
    const reviewId = searchParams.get('reviewId');
    if (!reviewId) return;

    const existing = rows.find((r) => String(r.id) === String(reviewId));
    if (existing) {
      setReviewingRow(existing);
      setSearchParams((prev) => {
        prev.delete('reviewId');
        return prev;
      }, { replace: true });
      return;
    }

    if (!loading) {
      getMaterialRequisition(reviewId)
        .then((r) => {
          setReviewingRow(r);
          setSearchParams((prev) => {
            prev.delete('reviewId');
            return prev;
          }, { replace: true });
        })
        .catch(() => {});
    }
  }, [searchParams, rows, loading, setSearchParams]);

  function projectTypeName(id) {
    if (!id) return '-';
    return projectTypes.find((pt) => String(pt.id) === String(id))?.name || id;
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this requisition?')) return;
    try {
      await deleteMaterialRequisition(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  async function handleConvert(row, kind) {
    const fn = { purchase: convertRequisitionToPurchase, po: convertRequisitionToPurchaseOrder, rfq: convertRequisitionToRfq }[kind];
    try {
      await fn(row.id);
      await loadRows();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Conversion failed');
    }
  }

  async function handleBulkConvert(kind) {
    if (selected.length === 0) return alert('Select at least one requisition');
    const fn = { purchase: convertRequisitionToPurchase, po: convertRequisitionToPurchaseOrder, rfq: convertRequisitionToRfq }[kind];
    for (const id of selected) {
      try { await fn(id); } catch { /* continue with remaining rows */ }
    }
    setSelected([]);
    await loadRows();
  }

  function toggleSelectAll(checked) {
    setSelected(checked ? paged.map((r) => r.id) : []);
  }
  function toggleSelectOne(id, checked) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.reference, r.supplier?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Requisition', to: '/requisition-module/material-requisition-list' },
                { label: 'Material Requisition List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Material Requisition List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track material requisitions and convert them to purchases</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkConvert('po')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple PO Convert
            </button>
            <button
              onClick={() => handleBulkConvert('rfq')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple RFQ Convert
            </button>
            <button
              onClick={() => handleBulkConvert('purchase')}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw size={13} /> Multiple Purchase Convert
            </button>
            <button
              onClick={() => navigate('/requisition-module/material-requisition-add')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <PlusCircle size={16} strokeWidth={2.5} /> New Material Requisition
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip — colorful stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={ClipboardList} label="Total Requisitions" value={rows.length} theme="indigo" />
          <StatCard icon={Search} label="Matching Search" value={filtered.length} theme="sky" />
          <StatCard icon={Layers} label="Showing" value={`${paged.length} / ${filtered.length}`} theme="amber" />
          <StatCard icon={CheckCircle2} label="Active Filters" value={activeFilterCount} theme="emerald" />
        </div>

        {/* Filters — collapsed behind a toggle button */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border shadow-sm transition-colors ${
                showFilters
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  showFilters ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                }`}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-full hover:bg-red-50 transition-colors"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-2 mb-4 text-slate-700">
                <ListFilter size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold">Filter requisitions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Select Date</label>
                  <div className="flex gap-2">
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Company</label>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Somikoron IT Ltd" />
                </div>
                <div>
                  <label className={labelCls}>Supplier</label>
                  <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className={inputCls}>
                    <option value="">Select an option</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Project</label>
                  <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={inputCls}>
                    <option value="">Select value</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requisitions..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={selected.length > 0 && selected.length === paged.length} className="rounded border-slate-300" />
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">ID</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Type</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Project</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Title</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Code</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Ref</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Date</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Demand</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">By</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Status</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">Approval</th>
                  <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">File</th>
                  <th className="px-2 py-2.5 text-right font-medium text-[11px] uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or add a new requisition.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const pendingCount = pendingQuotationCount(row);
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top text-xs ${
                          pendingCount > 0 ? 'bg-amber-50/40 border-l-2 border-l-amber-400' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => toggleSelectOne(row.id, e.target.checked)} className="rounded border-slate-300" />
                        </td>
                        <td className="px-2 py-2.5 text-slate-400 font-mono">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-2 py-2.5 text-slate-600">{projectTypeName(row.projectType)}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.project?.name || '-'}</td>
                        <td className="px-2 py-2.5 font-medium text-slate-700 max-w-[140px] truncate">{row.titleOfWork || '-'}</td>
                        <td className="px-2 py-2.5 text-slate-600 font-mono">{row.code}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.reference || '-'}</td>
                        <td className="px-2 py-2.5 text-slate-600">{fmtDate(row.date)}</td>
                        <td className="px-2 py-2.5 text-slate-600">{fmtDate(row.demandDate)}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.addedBy || '-'}</td>
                        <td className="px-2 py-2.5">
                          {(() => {
                            const st = requisitionStatus(row);
                            return <StatusBadge label={st.label} tone={st.tone} />;
                          })()}
                        </td>
                        <td className="px-2 py-2.5">
                          {(() => {
                            const approvals = row.approvals || [];
                            if (approvals.length === 0) {
                              return <StatusBadge label="Not Required" tone="slate" />;
                            }
                            const allApproved = approvals.every((a) => a.approved);
                            const pendingNames = approvals.filter((a) => !a.approved).map((a) => a.name);
                            return (
                              <div className="space-y-1">
                                {allApproved ? (
                                  <StatusBadge label="Approved" tone="emerald" />
                                ) : (
                                  <StatusBadge
                                    label={`Pending (${pendingNames.length})`}
                                    tone="amber"
                                  />
                                )}
                                {!allApproved && (
                                  <div className="text-[10px] text-slate-400 max-w-[140px] truncate" title={pendingNames.join(', ')}>
                                    Waiting on {pendingNames.join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-2.5">
                          {row.attachment ? (
                            <a href={row.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                              <Paperclip size={11} />
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center justify-end flex-wrap gap-1.5 max-w-[420px] ml-auto">
                            <ActionBtn
                              icon={Eye}
                              label="View"
                              onClick={() => setViewingRow(row)}
                            />
                            <ActionBtn
                              icon={Pencil}
                              label="Edit"
                              onClick={() => navigate(`/requisition-module/material-requisition-add/${row.id}`)}
                            />
                            <ActionBtn
                              icon={FileCheck2}
                              label="Review"
                              tone="indigo"
                              badge={pendingCount}
                              title={pendingCount > 0 ? `${pendingCount} quotation${pendingCount > 1 ? 's' : ''} awaiting review` : 'Review Quotations'}
                              onClick={() => setReviewingRow(row)}
                            />
                            <ActionBtn
                              icon={ShoppingCart}
                              label="Purchase"
                              onClick={() => handleConvert(row, 'purchase')}
                              title="Convert To Purchase"
                            />
                            <ActionBtn
                              icon={FileText}
                              label="PO"
                              onClick={() => handleConvert(row, 'po')}
                              title="Convert To Purchase Order"
                            />
                            <ActionBtn
                              icon={Send}
                              label="RFQ"
                              onClick={() => handleConvert(row, 'rfq')}
                              title="Convert To RFQ"
                            />
                            <ActionBtn
                              icon={Trash2}
                              label="Delete"
                              tone="red"
                              onClick={() => handleDelete(row)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {reviewingRow && (
        <QuotationReviewModal
          requisition={reviewingRow}
          onClose={() => setReviewingRow(null)}
          onAccepted={loadRows}
        />
      )}

      {viewingRow && (
        <RequisitionOverviewModal
          requisitionId={viewingRow.id}
          initialRow={viewingRow}
          onClose={() => setViewingRow(null)}
          onEdit={() => navigate(`/requisition-module/material-requisition-add/${viewingRow.id}`)}
        />
      )}
    </div>
  );
}