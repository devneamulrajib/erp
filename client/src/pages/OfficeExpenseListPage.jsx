// client/src/pages/OfficeExpenseListPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Calendar, Eye, Pencil, Trash2, Clock, CheckCircle2,
  XCircle, FileText, ArrowUpRight, X, TrendingUp, TrendingDown,
  Download, Layers, RefreshCw, Check, Lock
} from 'lucide-react';

import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import {
  getOfficeExpenses,
  deleteOfficeExpense,
  updateOfficeExpenseStatus,
} from '../api/officeExpense';

// ---- Status Styling ----
const STATUS = {
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 border-amber-200/70',
    dot: 'bg-amber-500',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    badge: 'bg-rose-50 text-rose-700 border-rose-200/70',
    dot: 'bg-rose-500',
  },
};

const CATEGORY_COLORS = [
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-sky-50 text-sky-800 border-sky-200',
  'bg-indigo-50 text-indigo-800 border-indigo-200',
  'bg-teal-50 text-teal-800 border-teal-200',
  'bg-blue-50 text-blue-800 border-blue-200',
  'bg-cyan-50 text-cyan-800 border-cyan-200',
  'bg-emerald-50 text-emerald-800 border-emerald-200',
  'bg-violet-50 text-violet-800 border-violet-200',
];

function categoryClass(name) {
  if (!name || name === '—') return 'bg-slate-100 text-slate-600 border-slate-200';
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

const textValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.name || value.title || value.label || value.fullName || value.code || value.reference || value.email || '—';
  }
  return '—';
};

const money = (value) => Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function OfficeExpenseListPage() {
  const navigate = useNavigate();

  // Current logged in user & role
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isAdmin = currentUser && ['superadmin', 'admin'].includes(currentUser.role);
  const isAccountant = currentUser?.role === 'accountant';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [viewing, setViewing] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOfficeExpenses({ from: fromDate || undefined, to: toDate || undefined });
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load office expenses:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, pageSize, categoryFilter, statusFilter]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const c = textValue(r.budgetCategory);
      if (c !== '—') set.add(c);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (categoryFilter && textValue(item.budgetCategory) !== categoryFilter) return false;
      if (statusFilter !== 'all' && textValue(item.status).toLowerCase() !== statusFilter) return false;
      if (!term) return true;
      const reference = textValue(item.reference);
      const title = textValue(item.title);
      return `${reference} ${title}`.toLowerCase().includes(term);
    });
  }, [rows, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalAmount = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const approvedCount = rows.filter((item) => textValue(item.status).toLowerCase() === 'approved').length;
  const pendingCount = rows.filter((item) => textValue(item.status).toLowerCase() === 'pending').length;
  const rejectedCount = rows.filter((item) => textValue(item.status).toLowerCase() === 'rejected').length;

  const monthlyTrend = useMemo(() => {
    const map = {};
    rows.forEach((item) => {
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + Number(item.amount || 0);
    });
    const sortedKeys = Object.keys(map).sort();
    const lastSix = sortedKeys.slice(-6);
    return lastSix.map((key) => {
      const [y, m] = key.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      return { key, label, total: map[key] };
    });
  }, [rows]);

  const momChange = useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const prev = monthlyTrend[monthlyTrend.length - 2].total;
    const curr = monthlyTrend[monthlyTrend.length - 1].total;
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [monthlyTrend]);

  // Handle Approve / Reject (Admin only)
  const handleStatusChange = async (item, newStatus) => {
    if (!isAdmin) {
      alert('Only administrators can approve or reject records.');
      return;
    }
    const verb = newStatus === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} "${item.title || item.reference}" for ৳${money(item.amount)}?`)) {
      return;
    }
    setUpdatingId(item.id);
    try {
      await updateOfficeExpenseStatus(item.id, newStatus);
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: newStatus } : r)));
      if (viewing && viewing.id === item.id) {
        setViewing((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      alert(error?.response?.data?.message || `Failed to ${verb} expense.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (item) => {
    const isItemApproved = textValue(item.status).toLowerCase() === 'approved';
    if (isAccountant && isItemApproved) {
      alert('Approved records cannot be deleted by an Accountant.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${item.title || item.reference}"?`)) return;
    try {
      await deleteOfficeExpense(item.id);
      await load();
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || 'Failed to delete expense.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setCategoryFilter('');
    setStatusFilter('all');
  };

  const hasActiveFilters = !!(search || fromDate || toDate || categoryFilter || statusFilter !== 'all');

  function exportCsv() {
    const headers = ['Date', 'Reference', 'Title', 'Category', 'Debit', 'Credit', 'Amount', 'Status', 'Added By'];
    const dataRows = filteredRows.map((item) => [
      formatDate(item.date), textValue(item.reference), textValue(item.title), textValue(item.budgetCategory),
      textValue(item.drAccount), textValue(item.crAccount), Number(item.amount || 0), textValue(item.status), textValue(item.addedBy),
    ]);
    const csv = [headers, ...dataRows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office_expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Drawer permission checks
  const isViewingApproved = viewing && textValue(viewing.status).toLowerCase() === 'approved';
  const canEditViewing = isAdmin || (!isViewingApproved && isAccountant);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800">
      <Topbar />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Office Budget', to: '/accounts-module/office-budget' },
            { label: 'Office Expense List' },
          ]}
        />

        {/* Page Header */}
        <div className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Office Expenses
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review disbursements, track approval status, and manage financial records.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition active:scale-[0.98]"
            >
              <Download size={14} className="text-slate-500" />
              Export
            </button>
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-expense')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs transition active:scale-[0.98]"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Analytics & Metrics Grid */}
        <section className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Net Disbursement
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {rows.length} total entries
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-slate-400">৳</span>
                  <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
                    {money(totalAmount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Aggregated office operational expenditures across all categories
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2.5">
              <StatPill label="Approved" count={approvedCount} statusKey="approved" />
              <StatPill label="Pending" count={pendingCount} statusKey="pending" />
              <StatPill label="Rejected" count={rejectedCount} statusKey="rejected" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Monthly Expenditure Velocity
                </h3>
              </div>
              {momChange !== null && (
                <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  momChange >= 0
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {momChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(momChange).toFixed(1)}% MoM
                </div>
              )}
            </div>

            <div className="py-2">
              {monthlyTrend.length < 2 ? (
                <div className="h-28 flex flex-col items-center justify-center text-xs text-slate-400">
                  <Layers size={18} className="mb-1 text-slate-300" />
                  Insufficient monthly transaction records to construct trendline
                </div>
              ) : (
                <TrendChart data={monthlyTrend} />
              )}
            </div>
          </div>
        </section>

        {/* Ledger Section */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3.5">
              <div className="relative w-full xl:max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search voucher reference, title..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DateFilter value={fromDate} onChange={setFromDate} placeholder="From date" />
                <DateFilter value={toDate} onChange={setToDate} placeholder="To date" />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                    title="Reset all filters"
                  >
                    <X size={13} />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Records</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredRows.length}
              </span>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs">
              {['all', 'approved', 'pending', 'rejected'].map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Expense Details</th>
                  <th className="py-3.5 px-4">Budget Category</th>
                  <th className="py-3.5 px-4">Accounting (DR / CR)</th>
                  <th className="py-3.5 px-4 text-right">Disbursement</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : pageRows.length === 0 ? (
                  <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
                ) : (
                  pageRows.map((item) => (
                    <ExpenseRow
                      key={item.id}
                      item={item}
                      isAdmin={isAdmin}
                      isAccountant={isAccountant}
                      updating={updatingId === item.id}
                      onView={() => setViewing(item)}
                      onEdit={() => navigate(`/accounts-module/office-expense/${item.id}`)}
                      onDelete={() => handleDelete(item)}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredRows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-slate-100 gap-3 bg-slate-50/30">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">{Math.min(page * pageSize, filteredRows.length)}</span> of{' '}
                <span className="font-semibold text-slate-700">{filteredRows.length}</span> records
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Previous
                </button>
                <div className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs">
                  {page} / {totalPages}
                </div>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Slide-Over Drawer */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setViewing(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col z-10 overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {textValue(viewing.reference)}
                </span>
                <h2 className="text-lg font-bold tracking-tight text-white mt-0.5">
                  Voucher Overview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Disbursed Amount</p>
                  <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    ৳ {money(viewing.amount)}
                  </p>
                </div>
                <StatusBadge status={viewing.status} />
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Date</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{formatDate(viewing.date)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Category</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{textValue(viewing.budgetCategory)}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Expense Title</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{textValue(viewing.title)}</p>
                <p className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">
                  Recorded by: <span className="text-slate-700 font-medium">{textValue(viewing.addedBy)}</span>
                </p>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Accounting Ledger</h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                  <div className="px-4 py-3 bg-emerald-50/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-800 mr-2">DR</span>
                      <span className="text-slate-700">{textValue(viewing.drAccount)}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">৳ {money(viewing.amount)}</span>
                  </div>
                  <div className="px-4 py-3 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-600 mr-2">CR</span>
                      <span className="text-slate-700">{textValue(viewing.crAccount)}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">৳ {money(viewing.amount)}</span>
                  </div>
                </div>
              </div>

              {viewing.description && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Narration / Note</h4>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs text-slate-700 leading-relaxed">
                    {textValue(viewing.description)}
                  </div>
                </div>
              )}

              {viewing.attachment && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Voucher Attachment</h4>
                  <a
                    href={resolveFileUrl(viewing.attachment)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition text-slate-700"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <span className="text-xs font-medium truncate">{String(viewing.attachment).split('/').pop()}</span>
                    </div>
                    <ArrowUpRight size={15} className="text-slate-400 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  textValue(viewing.status).toLowerCase() === 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === viewing.id}
                        onClick={() => handleStatusChange(viewing, 'approved')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-2xs"
                      >
                        <Check size={14} strokeWidth={2.5} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === viewing.id}
                        onClick={() => handleStatusChange(viewing, 'rejected')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 transition"
                      >
                        <X size={14} strokeWidth={2.5} />
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingId === viewing.id}
                      onClick={() => handleStatusChange(viewing, 'pending')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 transition"
                    >
                      Reset to Pending
                    </button>
                  )
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    {textValue(viewing.status).toLowerCase() === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <Lock size={12} /> Approved & Finalized
                      </span>
                    ) : (
                      'Awaiting Admin Review'
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition"
                >
                  Close
                </button>

                {canEditViewing && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewing.id;
                      setViewing(null);
                      navigate(`/accounts-module/office-expense/${id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                  >
                    <Pencil size={13} />
                    Edit Record
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, count, statusKey }) {
  const conf = STATUS[statusKey];
  return (
    <div className={`p-2.5 rounded-xl border ${conf.badge}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-90">
        <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
        {label}
      </div>
      <p className="mt-1 text-lg font-bold font-mono text-slate-900">{count}</p>
    </div>
  );
}

function TrendChart({ data }) {
  const width = 560;
  const height = 100;
  const paddingX = 14;
  const paddingY = 10;
  const values = data.map((d) => d.total);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.total - min) / range) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

        <path d={areaD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
        ))}
      </svg>

      <div className="flex justify-between mt-2 pt-1 border-t border-slate-100">
        {data.map((d) => (
          <div key={d.key} className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{d.label}</p>
            <p className="text-[11px] font-mono font-bold text-slate-700">৳{(d.total / 1000).toFixed(0)}k</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DateFilter({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={placeholder}
        className="bg-white border border-slate-200 rounded-xl pl-8 pr-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
      />
    </div>
  );
}

/* ---- Table Row with Approval Restrictions ---- */

function ExpenseRow({ item, isAdmin, isAccountant, updating, onView, onEdit, onDelete, onStatusChange }) {
  const status = textValue(item.status).toLowerCase();
  const category = textValue(item.budgetCategory);
  const isPending = status === 'pending';
  const isApproved = status === 'approved';

  // Rule: An approved record CANNOT be edited or deleted by an Accountant.
  const canEdit = isAdmin || (!isApproved && isAccountant);
  const canDelete = isAdmin || (!isApproved && isAccountant);

  return (
    <tr className="hover:bg-slate-50/70 transition group">
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className="text-xs font-medium text-slate-600">{formatDate(item.date)}</span>
      </td>

      <td className="py-3.5 px-4">
        <div className="max-w-[220px]">
          <p className="text-xs font-semibold text-slate-900 truncate" title={textValue(item.title)}>
            {textValue(item.title)}
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{textValue(item.reference)}</p>
        </div>
      </td>

      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${categoryClass(category)}`}>
          {category}
        </span>
      </td>

      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-semibold text-emerald-700">DR</span>
            <span className="truncate max-w-[120px]">{textValue(item.drAccount)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="font-semibold text-slate-500">CR</span>
            <span className="truncate max-w-[120px]">{textValue(item.crAccount)}</span>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
          ৳ {money(item.amount)}
        </span>
      </td>

      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        <StatusBadge status={status} />
      </td>

      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        {item.attachment ? (
          <a
            href={resolveFileUrl(item.attachment)}
            target="_blank"
            rel="noreferrer"
            title="Download voucher"
            className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
          >
            <FileText size={14} />
          </a>
        ) : (
          <span className="text-slate-300 font-mono">—</span>
        )}
      </td>

      {/* Action Column */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {/* Quick Approve / Reject buttons strictly for Admin on pending items */}
          {isAdmin && isPending && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={() => onStatusChange(item, 'approved')}
                title="Approve Voucher"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 transition"
              >
                <Check size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => onStatusChange(item, 'rejected')}
                title="Reject Voucher"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50 transition"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* View Details — Available to everyone */}
          <button
            type="button"
            onClick={onView}
            title="View Details"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition"
          >
            <Eye size={14} />
          </button>

          {/* Edit Record — Hidden for Accountant on Approved records */}
          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              title="Edit Record"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
            >
              <Pencil size={14} />
            </button>
          ) : (
            <span
              title="Finalized — Approved records cannot be edited"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 cursor-not-allowed"
            >
              <Lock size={13} />
            </span>
          )}

          {/* Delete Record — Hidden for Accountant on Approved records */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete Record"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  const key = textValue(status).toLowerCase();
  const config = STATUS[key] || STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${config.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function LoadingRows() {
  return Array.from({ length: 6 }).map((_, r) => (
    <tr key={r} className="animate-pulse">
      <td className="py-4 px-4"><div className="h-3 w-16 bg-slate-200/70 rounded" /></td>
      <td className="py-4 px-4"><div className="h-3 w-32 bg-slate-200/70 rounded" /></td>
      <td className="py-4 px-4"><div className="h-3 w-20 bg-slate-200/70 rounded" /></td>
      <td className="py-4 px-4"><div className="h-3 w-24 bg-slate-200/70 rounded" /></td>
      <td className="py-4 px-4 text-right"><div className="h-3 w-16 bg-slate-200/70 rounded ml-auto" /></td>
      <td className="py-4 px-4 text-center"><div className="h-5 w-16 bg-slate-200/70 rounded-full mx-auto" /></td>
      <td className="py-4 px-4 text-center"><div className="h-6 w-6 bg-slate-200/70 rounded mx-auto" /></td>
      <td className="py-4 px-4 text-right"><div className="h-6 w-20 bg-slate-200/70 rounded ml-auto" /></td>
    </tr>
  ));
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <tr>
      <td colSpan={8} className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FileText size={20} />
        </div>
        <p className="text-sm font-bold text-slate-800">No expense records found</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          {hasFilters
            ? 'There are no expense records matching your active filters. Try resetting search or date ranges.'
            : 'No office expenses have been logged yet. Click "Add Expense" to record your first transaction.'}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
          >
            <RefreshCw size={12} />
            Reset Filters
          </button>
        )}
      </td>
    </tr>
  );
}