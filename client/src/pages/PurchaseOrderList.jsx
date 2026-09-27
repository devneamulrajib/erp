import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  getPurchaseOrders, getPurchaseOrder, deletePurchaseOrder,
  createBillFromPurchaseOrder, confirmDelivery,
} from '../api/purchaseOrder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  PlusCircle, SlidersHorizontal, ChevronDown, X, ListFilter, ClipboardList, Search,
  Wallet, Eye, Pencil, Truck, FileText, Trash2, Paperclip, CheckCircle2, Plus, Banknote,
} from 'lucide-react';

function num(v) { return Number(v) || 0; }

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

function genTxnId() {
  return 'TXN' + Math.floor(100000 + Math.random() * 900000);
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';

function Badge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
    sky: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    rose: 'bg-rose-50 text-rose-600 ring-rose-600/10',
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tones[tone] || tones.slate}`}>
      {label}
    </span>
  );
}

function statusTone(status) {
  return status === 'Acknowledged' ? 'emerald' : 'sky';
}
function deliveryTone(status) {
  if (status === 'Delivered') return 'emerald';
  if (status === 'Shipped') return 'amber';
  return 'slate';
}
function paymentTone(status) {
  return status === 'Paid' ? 'emerald' : 'rose';
}

/* Colorful summary stat card — same language used on Material Requisition List */
function StatCard({ icon: Icon, label, value, theme }) {
  const themes = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    sky: 'bg-gradient-to-br from-sky-500 to-blue-600',
    amber: 'bg-gradient-to-br from-amber-400 to-orange-500',
    rose: 'bg-gradient-to-br from-rose-500 to-pink-600',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl ${themes[theme] || themes.indigo} px-4 py-3.5 shadow-sm`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/15 text-white">
          <Icon size={18} strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-white/80">{label}</div>
          <div className="text-xl font-semibold leading-tight text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

/* Small labeled action button */
function ActionBtn({ icon: Icon, label, onClick, tone = 'slate', title, disabled }) {
  const tones = {
    slate: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100',
    red: 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon size={13} />
      {label}
    </button>
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

/* Read-only overview popup — shown by the View action instead of the edit form */
function PurchaseOrderOverviewModal({ orderId, initialRow, onClose, onEdit }) {
  const [data, setData] = useState(initialRow || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPurchaseOrder(orderId)
      .then((o) => { if (!cancelled) setData(o); })
      .catch(() => { if (!cancelled) setError('Failed to load purchase order details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const items = data?.items || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
            <Eye size={15} />
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Purchase Order Overview</h2>
          {data && <Badge label={data.status || 'Submitted'} tone={statusTone(data.status)} />}
          {data && <Badge label={data.deliveryStatus || 'Pending'} tone={deliveryTone(data.deliveryStatus)} />}
          {data && <Badge label={data.paymentStatus || 'Unpaid'} tone={paymentTone(data.paymentStatus)} />}
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-10">
          {(data?.code || initialRow?.code) || '-'} — {(data?.titleOfWork || initialRow?.titleOfWork) || 'Purchase Order'}
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        {loading && !data ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <OverviewField label="Date" value={data?.date || '-'} />
              <OverviewField label="Supplier" value={data?.supplier?.name || '-'} />
              <OverviewField label="Project Type" value={data?.projectType || '-'} />
              <OverviewField label="Project" value={data?.project?.name || '-'} />
              <OverviewField label="Site" value={data?.site?.name || '-'} />
              <OverviewField label="Task" value={data?.task || '-'} />
              <OverviewField label="Added By" value={data?.addedBy || '-'} />
              <OverviewField label="Attachment" value={
                data?.attachment
                  ? <a href={data.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"><Paperclip size={12} /> View file</a>
                  : '-'
              } />
            </div>

            {(data?.boqItems || []).length > 0 && (
              <div className="mb-4">
                <div className={labelCls}>BOQ Items</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.boqItems.map((b, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">{b.label || b}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Item</th>
                    <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Unit</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Purchase Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Rate</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400">No items on this order</td></tr>
                  ) : (
                    items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td className="px-3 py-2 font-medium text-slate-700">{it.itemName}</td>
                        <td className="px-3 py-2 text-slate-600">{it.unit || '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{it.purchaseQty}</td>
                        <td className="px-3 py-2 text-right text-slate-600">৳{num(it.rate).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">৳{num(it.amount || num(it.rate) * num(it.purchaseQty)).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="text-xs text-slate-400 space-y-1">
                {data?.deliveryConfirmedAt && <p>Delivery confirmed {new Date(data.deliveryConfirmedAt).toLocaleDateString()}</p>}
                {data?.supplierPaymentConfirmedAt && <p>Supplier confirmed payment receipt {new Date(data.supplierPaymentConfirmedAt).toLocaleDateString()}</p>}
              </div>
              <p className="text-sm font-semibold text-slate-800">Grand Total: ৳{num(data?.grandTotal ?? data?.subtotal).toLocaleString()}</p>
            </div>

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
                <Pencil size={14} /> Edit Order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Invoice + payment popup — view the auto-generated bill, its line items,
   totals breakdown, payment history, and record a new payment right here
   (Cash, Bank, Cheque, bKash, Nagad — free-text method, so anything works). */
function BillPaymentModal({ billId, orderId, onClose, onPaymentRecorded }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [payMethod, setPayMethod] = useState('Cash');
  const [payIsCheque, setPayIsCheque] = useState(false);
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState('');

  function load() {
    setLoading(true);
    api.get(`/bill/${billId}`)
      .then((res) => setBill(res.data))
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [billId]);

  const items = bill?.BillLineItems || bill?.items || [];
  const payments = bill?.BillPayments || bill?.payments || [];
  const due = num(bill?.due);
  const isPaid = due <= 0 && num(bill?.grandTotal) > 0;

  async function handleAddPayment(e) {
    e.preventDefault();
    if (num(payAmount) <= 0) {
      setError('Enter a payment amount greater than 0');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const existingPayments = payments.map((p) => ({
        transactionId: p.transactionId,
        paymentMethod: p.paymentMethod,
        isCheque: p.isCheque,
        chequeReceiptNo: p.chequeReceiptNo,
        amount: p.amount,
        date: p.date,
      }));
      const newPayment = {
        transactionId: genTxnId(),
        paymentMethod: payMethod,
        isCheque: payIsCheque,
        chequeReceiptNo: payChequeNo,
        amount: num(payAmount),
        date: payDate,
      };

      // Resend VAT/AIT/interest fields as-is — the PUT /bill/:id route
      // recomputes totals purely from what's in the request body, so
      // omitting these would silently zero them out on the existing bill.
      const res = await api.put(`/bill/${billId}`, {
        vatIncluded: bill.vatIncluded,
        vatPercent: bill.vatPercent,
        aitIncluded: bill.aitIncluded,
        aitPercent: bill.aitPercent,
        interestRate: bill.interestRate,
        payments: [...existingPayments, newPayment],
      });

      setBill(res.data);
      setPayChequeNo('');
      setPayAmount('');
      onPaymentRecorded(orderId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet size={15} />
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Invoice & Payment</h2>
          {bill && <Badge label={isPaid ? 'Paid' : 'Unpaid'} tone={isPaid ? 'emerald' : 'rose'} />}
        </div>
        <p className="text-sm text-slate-500 mb-4 ml-10">{bill?.code || '-'}</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        {loading && !bill ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : bill ? (
          <>
            {/* Line items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Item</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Rate</th>
                    <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-slate-400">No line items</td></tr>
                  ) : (
                    items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td className="px-3 py-2 font-medium text-slate-700">{it.itemName}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{it.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">৳{num(it.rate).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">৳{num(it.amount).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals breakdown — this is the running spend tracker for this order */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <OverviewField label="Subtotal" value={`৳${num(bill.subtotal).toLocaleString()}`} />
              <OverviewField label="Grand Total" value={`৳${num(bill.grandTotal).toLocaleString()}`} />
              <OverviewField label="Paid" value={<span className="text-emerald-600 font-semibold">৳{num(bill.paid).toLocaleString()}</span>} />
              <OverviewField label="Due" value={<span className={due > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>৳{due.toLocaleString()}</span>} />
            </div>

            {/* Payment history */}
            <div className="mb-5">
              <div className={labelCls}>Payment History</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Method</th>
                      <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Cheque No</th>
                      <th className="text-right px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-[10px] uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-slate-400">No payments recorded yet</td></tr>
                    ) : (
                      payments.map((p, i) => (
                        <tr key={p.id || i}>
                          <td className="px-3 py-2 text-slate-700">{p.paymentMethod}</td>
                          <td className="px-3 py-2 text-slate-500">{p.chequeReceiptNo || '—'}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">৳{num(p.amount).toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-500">{p.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Record payment */}
            {!isPaid && (
              <form onSubmit={handleAddPayment} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className={`${labelCls} mb-3 flex items-center gap-1.5`}>
                  <Banknote size={13} className="text-slate-400" /> Record Payment
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Method</label>
                    <div className="flex items-center gap-2">
                      <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                        placeholder="Cash / Bank / bKash / Nagad" className={`${inputCls} flex-1`} />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                      <input type="checkbox" checked={payIsCheque} onChange={(e) => setPayIsCheque(e.target.checked)} className="accent-indigo-600" /> This is a cheque
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Amount</label>
                    <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={`Up to ৳${due.toLocaleString()}`} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Cheque / Receipt No</label>
                    <input value={payChequeNo} onChange={(e) => setPayChequeNo(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Plus size={14} /> {submitting ? 'Recording…' : 'Record Payment'}
                </button>
              </form>
            )}
            {isPaid && (
              <div className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 size={16} /> This invoice is fully paid.
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingBillId, setCreatingBillId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);
  const [payingRow, setPayingRow] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(
    () => [from, to, filterSupplier, filterProject].filter(Boolean).length,
    [from, to, filterSupplier, filterProject]
  );
  function clearFilters() {
    setFrom(''); setTo(''); setFilterSupplier(''); setFilterProject('');
  }

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPurchaseOrders({ from, to, supplier: filterSupplier, project: filterProject });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterSupplier, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/customers').then((res) => setSuppliers(asArray(res))).catch(() => {});
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(asArray(res))).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  // Auto-open the read-only overview when arriving via a notification link like
  // /procurement-module/purchase-order-list?viewId=42
  useEffect(() => {
    const viewId = searchParams.get('viewId');
    if (!viewId) return;

    const existing = rows.find((r) => String(r.id) === String(viewId));
    if (existing) {
      setViewingRow(existing);
      setSearchParams((prev) => { prev.delete('viewId'); return prev; }, { replace: true });
      return;
    }
    if (!loading) {
      getPurchaseOrder(viewId)
        .then((r) => {
          setViewingRow(r);
          setSearchParams((prev) => { prev.delete('viewId'); return prev; }, { replace: true });
        })
        .catch(() => {});
    }
  }, [searchParams, rows, loading, setSearchParams]);

  function projectTypeName(id) {
    if (!id) return '-';
    return projectTypes.find((pt) => String(pt.id) === String(id))?.name || id;
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this purchase order?')) return;
    try {
      await deletePurchaseOrder(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  async function handleCreateBill(row) {
    setCreatingBillId(row.id);
    try {
      const result = await createBillFromPurchaseOrder(row.id);
      const refreshed = await getPurchaseOrder(row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? refreshed : r)));
      setPayingRow(refreshed);
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to create bill');
    } finally {
      setCreatingBillId(null);
    }
  }

  async function handleConfirmDelivery(row) {
    setConfirmingId(row.id);
    try {
      const result = await confirmDelivery(row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? result.purchaseOrder : r)));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to confirm delivery');
    } finally {
      setConfirmingId(null);
    }
  }

  // Called by BillPaymentModal after a payment is recorded — refreshes just
  // that row so the list's Paid/Due amounts and payment status stay in sync.
  async function handlePaymentRecorded(orderId) {
    try {
      const refreshed = await getPurchaseOrder(orderId);
      setRows((prev) => prev.map((r) => (r.id === orderId ? refreshed : r)));
    } catch { /* modal already shows the updated bill regardless */ }
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

  const pendingConfirmCount = rows.filter((r) => r.deliveryStatus === 'Delivered' && !r.deliveryConfirmedAt).length;
  const unpaidCount = rows.filter((r) => r.paymentStatus !== 'Paid').length;
  const totalSpent = rows.reduce((sum, r) => sum + num(r.bill?.paid), 0);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Inventory', to: '/procurement-module/purchase-order-list' },
                { label: 'Purchase Order List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Purchase Order List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track orders, deliveries, invoices, and payments</p>
          </div>
          <button
            onClick={() => navigate('/procurement-module/purchase-order')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <PlusCircle size={16} strokeWidth={2.5} /> Create New Purchase Order
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard icon={ClipboardList} label="Total Orders" value={rows.length} theme="indigo" />
          <StatCard icon={Search} label="Matching Search" value={filtered.length} theme="sky" />
          <StatCard icon={Truck} label="Awaiting Delivery Confirm" value={pendingConfirmCount} theme="amber" />
          <StatCard icon={Wallet} label="Unpaid" value={unpaidCount} theme="rose" />
          <StatCard icon={Banknote} label="Total Spent" value={`৳${totalSpent.toLocaleString()}`} theme="emerald" />
        </div>

        {/* Filters — collapsed behind a toggle button */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border shadow-sm transition-colors ${
                showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
            <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-700">
                <ListFilter size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold">Filter purchase orders</span>
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
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search purchase orders..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Type', 'Project', 'Title', 'Supplier', 'Code', 'Ref', 'Date', 'Sub Total',
                    'Grand Total', 'Status', 'Delivery', 'Payment', 'Invoice', 'By'].map((h) => (
                    <th key={h} className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-2 py-2.5 text-right font-medium text-[11px] uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={16} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or create a new order.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const canConfirmDelivery = row.deliveryStatus === 'Delivered' && !row.deliveryConfirmedAt;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top text-xs">
                        <td className="px-2 py-2.5 text-slate-400 font-mono">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-2 py-2.5 text-slate-600">{projectTypeName(row.projectType)}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.project?.name || '-'}</td>
                        <td className="px-2 py-2.5 font-medium text-slate-700 max-w-[140px] truncate">{row.titleOfWork || '-'}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.supplier?.name || '-'}</td>
                        <td className="px-2 py-2.5 text-slate-600 font-mono">{row.code}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.reference || '-'}</td>
                        <td className="px-2 py-2.5 text-slate-600">{row.date}</td>
                        <td className="px-2 py-2.5 text-slate-600">{num(row.subtotal).toLocaleString()}</td>
                        <td className="px-2 py-2.5 font-semibold text-slate-800">{num(row.grandTotal).toLocaleString()}</td>
                        <td className="px-2 py-2.5"><Badge label={row.status || 'Submitted'} tone={statusTone(row.status)} /></td>
                        <td className="px-2 py-2.5">
                          <Badge label={row.deliveryStatus || 'Pending'} tone={deliveryTone(row.deliveryStatus)} />
                          {row.deliveryConfirmedAt && <div className="text-[10px] text-emerald-600 mt-1">✓ Confirmed</div>}
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge label={row.paymentStatus || 'Unpaid'} tone={paymentTone(row.paymentStatus)} />
                          {row.bill && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              ৳{num(row.bill.paid).toLocaleString()} / ৳{num(row.bill.grandTotal).toLocaleString()}
                              {num(row.bill.due) > 0 && <span className="text-rose-500"> (due ৳{num(row.bill.due).toLocaleString()})</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          {row.convertedToBillId ? (
                            <button onClick={() => setPayingRow(row)} className="text-indigo-600 hover:text-indigo-700 underline font-medium">
                              View
                            </button>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-2 py-2.5 text-slate-600">{row.addedBy || '-'}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center justify-end flex-wrap gap-1.5 max-w-[360px] ml-auto">
                            <ActionBtn icon={Eye} label="View" onClick={() => setViewingRow(row)} />
                            <ActionBtn icon={Pencil} label="Edit" onClick={() => navigate(`/procurement-module/purchase-order/${row.id}`)} />
                            {canConfirmDelivery && (
                              <ActionBtn
                                icon={CheckCircle2}
                                label={confirmingId === row.id ? 'Confirming…' : 'Confirm Delivery'}
                                tone="amber"
                                disabled={confirmingId === row.id}
                                onClick={() => handleConfirmDelivery(row)}
                              />
                            )}
                            {!row.convertedToBillId && row.deliveryConfirmedAt && (
                              <ActionBtn
                                icon={FileText}
                                label={creatingBillId === row.id ? 'Creating…' : 'Create Bill'}
                                tone="emerald"
                                disabled={creatingBillId === row.id}
                                onClick={() => handleCreateBill(row)}
                              />
                            )}
                            {row.convertedToBillId && (
                              <ActionBtn
                                icon={Wallet}
                                label="Bill / Payment"
                                tone="indigo"
                                onClick={() => setPayingRow(row)}
                              />
                            )}
                            <ActionBtn icon={Trash2} label="Delete" tone="red" onClick={() => handleDelete(row)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{n}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>

      {viewingRow && (
        <PurchaseOrderOverviewModal
          orderId={viewingRow.id}
          initialRow={viewingRow}
          onClose={() => setViewingRow(null)}
          onEdit={() => navigate(`/procurement-module/purchase-order/${viewingRow.id}`)}
        />
      )}

      {payingRow && (
        <BillPaymentModal
          billId={payingRow.convertedToBillId}
          orderId={payingRow.id}
          onClose={() => setPayingRow(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}