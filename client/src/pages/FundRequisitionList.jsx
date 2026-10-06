import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  getFundRequisitions,
  createFundRequisition,
  updateFundRequisition,
  addFundRequisitionPayment,
  cancelFundRequisition,
  deleteFundRequisition,
  approveFundRequisition,
  rejectFundRequisition,
} from '../api/fundRequisition';
import { getUsers } from '../api/user';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Wallet,
  X,
  Search,
  ClipboardList,
  Eye,
  Ban,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
} from 'lucide-react';

const CATEGORIES = [
  'Site Expense',
  'Labour',
  'Supplier Advance',
  'Material',
  'Office',
  'Utility',
  'Transport',
  'Other',
];

function num(v) {
  return Number(v) || 0;
}
const money = (v) => num(v).toLocaleString();

function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '-';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return '-';
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const emptyForm = () => ({
  date: todayStr(),
  category: '',
  project: '',
  site: '',
  from: '',
  payTo: '',
  amount: '',
  priority: 'Normal',
  requiredBy: '',
  purpose: '',
  remarks: '',
  linkedReference: '',
});

const emptyFilters = {
  from: '',
  approveStatus: '',
  paymentState: '',
  projectId: '',
  dateFrom: '',
  dateTo: '',
};

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all';
const labelCls = 'block text-[11px] font-semibold text-slate-600 mb-1';

const APPROVAL_BADGE = {
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'Pending Approval': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Cancelled: 'bg-rose-50 text-rose-600 ring-rose-500/20',
  Rejected: 'bg-rose-50 text-rose-600 ring-rose-500/20',
};

const PAYMENT_BADGE = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Partial: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Unpaid: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

export default function FundRequisitionList() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Details Modal
  const [viewRow, setViewRow] = useState(null);

  // Approval Modal
  const [approveRow, setApproveRow] = useState(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  // Rejection Modal
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Payment Modal
  const [paymentRow, setPaymentRow] = useState(null);
  const [payment, setPayment] = useState({
    amount: '',
    method: 'Cash',
    date: todayStr(),
    reference: '',
    note: '',
    markDone: false,
  });
  const [paymentError, setPaymentError] = useState('');
  const [paying, setPaying] = useState(false);

  // Cancel Modal
  const [cancelRow, setCancelRow] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const data = await getFundRequisitions(params);
      setRows(asArray(data));
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load fund requisitions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, filters]);

  useEffect(() => {
    getUsers().then((res) => setUsers(asArray(res))).catch(() => {});
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
    api.get('/sites').then((res) => setSites(asArray(res))).catch(() => {});
  }, []);

  // ---------- Approval Handlers ----------
  function openApproveModal(row) {
    setApproveRow(row);
    setApprovedAmount(row.amount ?? '');
    setApprovalNote('');
    setApproveError('');
  }

  async function handleApproveSubmit() {
    setApproveError('');
    const amt = num(approvedAmount);
    if (amt <= 0) return setApproveError('Approved amount must be greater than 0');

    setApproving(true);
    try {
      if (typeof approveFundRequisition === 'function') {
        await approveFundRequisition(approveRow.id, {
          approvedAmount: amt,
          note: approvalNote.trim(),
        });
      } else {
        await api.post(`/fund-requisitions/${approveRow.id}/approve`, {
          approvedAmount: amt,
          note: approvalNote.trim(),
        });
      }
      setApproveRow(null);
      if (viewRow?.id === approveRow.id) setViewRow(null);
      await loadRows();
    } catch (e) {
      setApproveError(e.response?.data?.message || e.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  }

  function openRejectModal(row) {
    setRejectRow(row);
    setRejectReason('');
    setRejectError('');
  }

  async function handleRejectSubmit() {
    if (!rejectReason.trim()) return setRejectError('Reason for rejection is required');
    setRejecting(true);
    try {
      if (typeof rejectFundRequisition === 'function') {
        await rejectFundRequisition(rejectRow.id, { reason: rejectReason.trim() });
      } else {
        await api.post(`/fund-requisitions/${rejectRow.id}/reject`, { reason: rejectReason.trim() });
      }
      setRejectRow(null);
      if (viewRow?.id === rejectRow.id) setViewRow(null);
      await loadRows();
    } catch (e) {
      setRejectError(e.response?.data?.message || e.message || 'Failed to reject requisition');
    } finally {
      setRejecting(false);
    }
  }

  // ---------- Add / Edit ----------
  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setForm({
      date: row.date || todayStr(),
      category: row.category || '',
      project: row.projectId ?? '',
      site: row.siteId ?? '',
      from: row.fromUserId ?? '',
      payTo: row.payTo || '',
      amount: row.amount ?? '',
      priority: row.priority || 'Normal',
      requiredBy: row.requiredBy || '',
      purpose: row.purpose || '',
      remarks: row.remarks || '',
      linkedReference: row.linkedReference || '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.date) return setFormError('Date is required');
    if (!form.category) return setFormError('Please choose a category');
    if (num(form.amount) <= 0) return setFormError('Amount must be greater than 0');
    if (!form.purpose.trim()) return setFormError('Purpose is required');
    if (form.requiredBy && form.requiredBy < form.date) {
      return setFormError('Required date cannot precede requisition date');
    }

    setSubmitting(true);
    try {
      const payload = { ...form, amount: num(form.amount) };
      if (editingId) await updateFundRequisition(editingId, payload);
      else await createFundRequisition(payload);
      setShowModal(false);
      await loadRows();
    } catch (e2) {
      setFormError(e2.response?.data?.message || e2.message || 'Failed to save requisition');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete ${row.reference}? This action cannot be undone.`)) return;
    try {
      await deleteFundRequisition(row.id);
      await loadRows();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  // ---------- Payments & Cancellations ----------
  function openPaymentModal(row) {
    setPaymentRow(row);
    setPayment({
      amount: row.balance || '',
      method: 'Cash',
      date: todayStr(),
      reference: '',
      note: '',
      markDone: false,
    });
    setPaymentError('');
  }

  async function handleAddPayment() {
    setPaymentError('');
    const amt = num(payment.amount);
    if (amt <= 0) return setPaymentError('Enter a valid payment amount');
    if (amt > num(paymentRow.balance)) {
      return setPaymentError(`Amount exceeds remaining balance (${money(paymentRow.balance)})`);
    }
    setPaying(true);
    try {
      await addFundRequisitionPayment(paymentRow.id, { ...payment, amount: amt });
      setPaymentRow(null);
      await loadRows();
    } catch (e) {
      setPaymentError(e.response?.data?.message || e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  function openCancelModal(row) {
    setCancelRow(row);
    setCancelReason('');
    setCancelError('');
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return setCancelError('A reason is required to cancel');
    setCancelling(true);
    try {
      await cancelFundRequisition(cancelRow.id, { reason: cancelReason.trim() });
      setCancelRow(null);
      await loadRows();
    } catch (e) {
      setCancelError(e.response?.data?.message || e.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!q) return true;
    return [r.reference, r.project?.name, r.site?.name, r.from?.name, r.payTo, r.category, r.purpose]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const live = rows.filter((r) => !r.cancelled);
  const stats = {
    total: rows.length,
    pending: live.filter((r) => r.approvalStatus === 'Pending Approval').length,
    toPay: live.reduce((s, r) => s + num(r.balance), 0),
    paid: live.reduce((s, r) => s + num(r.paidAmount), 0),
  };

  const siteOptions = sites.filter(
    (s) => !form.project || !s.projectId || String(s.projectId) === String(form.project)
  );
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen w-full bg-slate-50/60 font-sans text-left">
      <Topbar />

      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-6 space-y-5">
        {/* Header banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Requisition', to: '/requisition-module/fund-requisition' },
                { label: 'Fund Requisition List' },
              ]}
            />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Fund Requisition List
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review and manage operational requisitions, approvals, and fund settlements.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/25 transition-all"
          >
            <PlusCircle size={16} strokeWidth={2.2} /> New Requisition
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200/60 text-red-700 text-xs sm:text-sm rounded-xl p-3.5 shadow-sm">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Requisitions"
            value={stats.total}
            icon={ClipboardList}
            color="text-slate-800"
            bg="bg-slate-100"
          />
          <StatCard
            label="Pending Approval"
            value={stats.pending}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            label="Approved & To Pay"
            value={money(stats.toPay)}
            icon={AlertCircle}
            color="text-rose-600"
            bg="bg-rose-50"
          />
          <StatCard
            label="Total Settled / Paid"
            value={money(stats.paid)}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
        </div>

        {/* Filter strip */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs sm:text-sm font-semibold text-slate-800">Filter Records</span>
            {hasFilters && (
              <button
                onClick={() => setFilters(emptyFilters)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
              >
                <RotateCcw size={12} /> Reset Filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div>
              <label className={labelCls}>Requested By</label>
              <select
                value={filters.from}
                onChange={(e) => setFilter('from', e.target.value)}
                className={inputCls}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => setFilter('projectId', e.target.value)}
                className={inputCls}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Approval Status</label>
              <select
                value={filters.approveStatus}
                onChange={(e) => setFilter('approveStatus', e.target.value)}
                className={inputCls}
              >
                <option value="">All (Active)</option>
                <option value="Pending Approval">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Status</label>
              <select
                value={filters.paymentState}
                onChange={(e) => setFilter('paymentState', e.target.value)}
                className={inputCls}
              >
                <option value="">All States</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilter('dateTo', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requisition #, purpose..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="px-2.5 py-2.5 w-10 text-center">SL</th>
                  <th className="px-2.5 py-2.5">Requisition</th>
                  <th className="px-2.5 py-2.5">Project / Site</th>
                  <th className="px-2.5 py-2.5">Requester / Payee</th>
                  <th className="px-2.5 py-2.5">Category</th>
                  <th className="px-2.5 py-2.5">Purpose</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Requested</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Approved</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Paid</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Balance</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Approval</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Payment</th>
                  <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16 text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        Fetching requisitions...
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-14">
                      <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                        <ClipboardList size={30} strokeWidth={1.4} />
                        <p className="text-xs font-medium">No requisitions matched your query</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const isPending = row.approvalStatus === 'Pending Approval' || row.canApprove;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-indigo-50/20 transition-colors ${
                          row.cancelled ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        <td className="px-2.5 py-2 text-slate-400 font-mono text-[11px] text-center">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block leading-tight">
                            {row.reference || '-'}
                          </span>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{fmtDate(row.date)}</span>
                            {row.priority === 'Urgent' && (
                              <span className="bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-600/20 font-bold px-1 rounded text-[9px]">
                                URGENT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-2">
                          <div className="font-medium text-slate-900 leading-snug">{row.project?.name || '-'}</div>
                          {row.site?.name && (
                            <div className="text-[11px] text-slate-400 leading-tight">{row.site.name}</div>
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          <div className="font-medium text-slate-900 leading-snug">{row.from?.name || '-'}</div>
                          {row.payTo && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[120px]" title={row.payTo}>
                              Pay: {row.payTo}
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[11px] font-medium">
                            {row.category || '-'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 max-w-[140px] truncate text-slate-600" title={row.purpose}>
                          {row.purpose || '-'}
                        </td>
                        <td className="px-2.5 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                          {money(row.amount)}
                        </td>
                        <td className="px-2.5 py-2 text-right text-indigo-600 font-medium whitespace-nowrap">
                          {row.payable ? money(row.payable) : '-'}
                        </td>
                        <td className="px-2.5 py-2 text-right text-emerald-600 font-medium whitespace-nowrap">
                          {money(row.paidAmount)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-semibold text-rose-600 whitespace-nowrap">
                          {row.payable ? money(row.balance) : '-'}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <Badge cls={APPROVAL_BADGE[row.approvalStatus]}>
                            {row.approvalStatus}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {row.cancelled ? (
                            <span className="text-[11px] text-slate-400 font-mono">-</span>
                          ) : (
                            <Badge cls={PAYMENT_BADGE[row.paymentState]}>
                              {row.paymentState}
                            </Badge>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            {isPending && !row.cancelled && (
                              <IconBtn
                                title="Approve"
                                onClick={() => openApproveModal(row)}
                                hover="hover:bg-emerald-600 hover:text-white"
                                bg="bg-emerald-50 text-emerald-700"
                              >
                                <Check size={13} strokeWidth={2.5} />
                              </IconBtn>
                            )}

                            {isPending && !row.cancelled && (
                              <IconBtn
                                title="Reject"
                                onClick={() => openRejectModal(row)}
                                hover="hover:bg-rose-600 hover:text-white"
                                bg="bg-rose-50 text-rose-700"
                              >
                                <XCircle size={13} />
                              </IconBtn>
                            )}

                            <IconBtn
                              title="View Details"
                              onClick={() => setViewRow(row)}
                              hover="hover:bg-slate-200 hover:text-slate-800"
                            >
                              <Eye size={13} />
                            </IconBtn>

                            {row.canPay && (
                              <IconBtn
                                title="Add Payment"
                                onClick={() => openPaymentModal(row)}
                                hover="hover:bg-purple-100 hover:text-purple-700"
                              >
                                <Wallet size={13} />
                              </IconBtn>
                            )}
                            {row.canEdit && (
                              <IconBtn
                                title="Edit"
                                onClick={() => openEditModal(row)}
                                hover="hover:bg-indigo-100 hover:text-indigo-700"
                              >
                                <Pencil size={13} />
                              </IconBtn>
                            )}
                            {row.canCancel && (
                              <IconBtn
                                title="Cancel"
                                onClick={() => openCancelModal(row)}
                                hover="hover:bg-amber-100 hover:text-amber-700"
                              >
                                <Ban size={13} />
                              </IconBtn>
                            )}
                            {row.canDelete && (
                              <IconBtn
                                title="Delete"
                                onClick={() => handleDelete(row)}
                                hover="hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 size={13} />
                              </IconBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-100 gap-2.5">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-800">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-semibold text-slate-800">{filtered.length}</span> entries
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .map((n, idx, arr) => (
                    <span key={n} className="flex items-center">
                      {idx > 0 && n - arr[idx - 1] > 1 && (
                        <span className="px-1 text-slate-400 text-xs">...</span>
                      )}
                      <button
                        onClick={() => setPage(n)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          n === page
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {n}
                      </button>
                    </span>
                  ))}
              </div>
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADMIN APPROVAL */}
      {approveRow && (
        <Overlay
          title="Approve Fund Requisition"
          subtitle={`Approve requisition ${approveRow.reference}`}
          onClose={() => setApproveRow(null)}
        >
          {approveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{approveError}</span>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Amount:</span>
              <span className="font-bold text-slate-800">{money(approveRow.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Requester:</span>
              <span className="font-medium text-slate-700">{approveRow.from?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Purpose:</span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]" title={approveRow.purpose}>
                {approveRow.purpose}
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            <Field label="Approved Amount" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className={inputCls}
                placeholder="Enter approved amount"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                You can approve the full requested amount or revise it.
              </p>
            </Field>

            <Field label="Approval Note (Optional)">
              <textarea
                rows={2}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className={inputCls}
                placeholder="Add any instructions or remarks for accounts/cashier..."
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3.5 mt-4 border-t border-slate-100">
            <button
              onClick={() => setApproveRow(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveSubmit}
              disabled={approving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              {approving ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </Overlay>
      )}

      {/* MODAL: ADMIN REJECTION */}
      {rejectRow && (
        <Overlay
          title="Reject Fund Requisition"
          subtitle={`Rejecting ${rejectRow.reference}`}
          onClose={() => setRejectRow(null)}
        >
          {rejectError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-xs">
              {rejectError}
            </div>
          )}

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 mb-3 text-xs text-amber-800">
            Rejecting this requisition will mark it as denied and close it from further payments.
          </div>

          <Field label="Reason for Rejection" required>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={inputCls}
              placeholder="State the reason for rejecting this request..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3.5 mt-4 border-t border-slate-100">
            <button
              onClick={() => setRejectRow(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectSubmit}
              disabled={rejecting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {rejecting ? 'Rejecting...' : 'Reject Requisition'}
            </button>
          </div>
        </Overlay>
      )}

      {/* MODAL: VIEW DETAILS */}
      {viewRow && (
        <Overlay
          title={`Requisition: ${viewRow.reference || 'Draft'}`}
          subtitle={`Submitted on ${fmtDate(viewRow.date)}`}
          onClose={() => setViewRow(null)}
          wide
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-1.5">
              <Badge cls={APPROVAL_BADGE[viewRow.approvalStatus]}>
                {viewRow.approvalStatus}
              </Badge>
              {!viewRow.cancelled && (
                <Badge cls={PAYMENT_BADGE[viewRow.paymentState]}>
                  {viewRow.paymentState}
                </Badge>
              )}
              {viewRow.priority === 'Urgent' && (
                <Badge cls="bg-red-50 text-red-600 ring-red-600/20 font-bold">Urgent</Badge>
              )}
            </div>

            {viewRow.approvalStatus === 'Pending Approval' && !viewRow.cancelled && (
              <div className="flex gap-2">
                <button
                  onClick={() => openRejectModal(viewRow)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => openApproveModal(viewRow)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                >
                  Approve
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Requested</div>
              <div className="text-sm font-bold text-slate-800">{money(viewRow.amount)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Approved</div>
              <div className="text-sm font-bold text-indigo-600">
                {viewRow.payable ? money(viewRow.payable) : '-'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Paid</div>
              <div className="text-sm font-bold text-emerald-600">{money(viewRow.paidAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Balance</div>
              <div className="text-sm font-bold text-rose-600">
                {viewRow.payable ? money(viewRow.balance) : '-'}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs mb-5">
            <Detail label="Project / Site">
              {viewRow.project?.name || '-'}{viewRow.site?.name ? ` • ${viewRow.site.name}` : ''}
            </Detail>
            <Detail label="Category">{viewRow.category}</Detail>
            <Detail label="Requested By">{viewRow.from?.name}</Detail>
            <Detail label="Payee">{viewRow.payTo}</Detail>
            <Detail label="Required Date">{viewRow.requiredBy ? fmtDate(viewRow.requiredBy) : '-'}</Detail>
            <Detail label="Reference">{viewRow.linkedReference}</Detail>
            <div className="sm:col-span-2">
              <Detail label="Purpose">{viewRow.purpose}</Detail>
            </div>
            {viewRow.remarks && (
              <div className="sm:col-span-2">
                <Detail label="Remarks">{viewRow.remarks}</Detail>
              </div>
            )}
          </dl>

          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">Approvers Status</h3>
          <div className="space-y-1.5 mb-4 bg-white border border-slate-100 p-2.5 rounded-xl">
            {(viewRow.approvals || []).length === 0 ? (
              <p className="text-xs text-slate-400">No approval layers assigned.</p>
            ) : (
              viewRow.approvals.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {a.approved ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={a.approved ? 'font-medium text-slate-800' : 'text-slate-500'}>
                    {a.name} {a.approved ? '(Approved)' : '(Pending)'}
                  </span>
                </div>
              ))
            )}
          </div>

          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">Recorded Payments</h3>
          {(viewRow.payments || []).length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              No payments have been recorded yet.
            </p>
          ) : (
            <div className="border border-slate-100 rounded-xl overflow-hidden mb-3">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left">Date</th>
                    <th className="px-2.5 py-1.5 text-left">Method</th>
                    <th className="px-2.5 py-1.5 text-left">Reference</th>
                    <th className="px-2.5 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewRow.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-2.5 py-1.5 text-slate-700">{fmtDate(p.date)}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{p.method}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{p.reference || '-'}</td>
                      <td className="px-2.5 py-1.5 text-right font-medium text-slate-900">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setViewRow(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </Overlay>
      )}

      {/* MODAL: ADD / EDIT */}
      {showModal && (
        <Overlay
          title={editingId ? 'Edit Fund Requisition' : 'Create Fund Requisition'}
          subtitle="Fill in the details to submit for multi-tier approval."
          onClose={() => setShowModal(false)}
          wide
        >
          {formError && (
            <div className="bg-red-50 border border-red-200/80 text-red-700 rounded-xl p-3 mb-4 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Field label="Requisition Date" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Category" required>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Expense Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Project (Optional)">
                <select
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value, site: '' })}
                  className={inputCls}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Site (Optional)">
                <select
                  value={form.site}
                  onChange={(e) => setForm({ ...form, site: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Site</option>
                  {siteOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Requested By">
                <select
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Myself (Active Session)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Payable To (Receiver Name)">
                <input
                  value={form.payTo}
                  onChange={(e) => setForm({ ...form, payTo: e.target.value })}
                  className={inputCls}
                  placeholder="Person, vendor, or contractor name"
                />
              </Field>

              <Field label="Requested Amount" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Priority">
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </Field>

                <Field label="Required By">
                  <input
                    type="date"
                    value={form.requiredBy}
                    min={form.date}
                    onChange={(e) => setForm({ ...form, requiredBy: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Purpose of Funds" required>
                  <textarea
                    rows={2}
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className={inputCls}
                    placeholder="Provide clear justification for this payment request..."
                  />
                </Field>
              </div>

              <Field label="Linked Reference">
                <input
                  value={form.linkedReference}
                  onChange={(e) => setForm({ ...form, linkedReference: e.target.value })}
                  className={inputCls}
                  placeholder="PO, Bill, or Work Order #"
                />
              </Field>

              <Field label="Remarks">
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className={inputCls}
                  placeholder="Any extra details"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : editingId ? 'Save Changes' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* MODAL: PAYMENT */}
      {paymentRow && (
        <Overlay
          title="Record Payment"
          subtitle={`Adding payment for ${paymentRow.reference}`}
          onClose={() => setPaymentRow(null)}
        >
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 text-xs text-slate-600 space-y-1">
            <div>Purpose: <span className="font-semibold text-slate-800">{paymentRow.purpose}</span></div>
            <div className="flex justify-between">
              <span>Approved: {money(paymentRow.payable)}</span>
              <span className="font-bold text-rose-600">Balance: {money(paymentRow.balance)}</span>
            </div>
          </div>

          {paymentError && (
            <div className="bg-red-50 border border-red-200/80 text-red-700 rounded-xl p-2.5 mb-3 text-xs flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>{paymentError}</span>
            </div>
          )}

          <div className="space-y-3">
            <Field label="Payment Amount" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Method">
                <select
                  value={payment.method}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                  className={inputCls}
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={payment.date}
                  onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {payment.method !== 'Cash' && (
              <Field label={payment.method === 'Cheque' ? 'Cheque No' : 'Transaction Ref'}>
                <input
                  value={payment.reference}
                  onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Note">
              <input
                value={payment.note}
                onChange={(e) => setPayment({ ...payment, note: e.target.value })}
                className={inputCls}
                placeholder="Optional remarks"
              />
            </Field>

            <label className="flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={payment.markDone}
                onChange={(e) => setPayment({ ...payment, markDone: e.target.checked })}
                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              Close requisition (settled completely)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 mt-3.5 border-t border-slate-100">
            <button
              onClick={() => setPaymentRow(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPayment}
              disabled={paying}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {paying ? 'Saving...' : 'Add Payment'}
            </button>
          </div>
        </Overlay>
      )}

      {/* MODAL: CANCEL */}
      {cancelRow && (
        <Overlay
          title="Cancel Requisition"
          subtitle="Cancelled requisitions cannot be approved or paid."
          onClose={() => setCancelRow(null)}
        >
          <div className="text-xs text-slate-600 mb-3 bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl">
            You are about to cancel <strong className="text-slate-800">{cancelRow.reference}</strong> for amount of{' '}
            <strong className="text-slate-800">{money(cancelRow.amount)}</strong>.
          </div>

          {cancelError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2.5 mb-3 text-xs">
              {cancelError}
            </div>
          )}

          <Field label="Cancellation Reason" required>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className={inputCls}
              placeholder="Provide why this request is cancelled..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
            <button
              onClick={() => setCancelRow(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ------------------- AUXILIARY COMPONENTS -------------------

function Overlay({ title, subtitle, onClose, wide, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } p-5 overflow-hidden my-auto`}
      >
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-130px)] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
        <div className={`text-lg sm:text-xl font-bold tracking-tight ${color}`}>{value}</div>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Badge({ cls = '', children }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

function IconBtn({ title, onClick, hover, bg = 'bg-slate-100 text-slate-600', children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${bg} ${hover}`}
    >
      {children}
    </button>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="text-slate-800 font-medium mt-0.5 leading-snug">{children || '-'}</dd>
    </div>
  );
}