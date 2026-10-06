// client/src/pages/AdminApprovalCenter.jsx
import { useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, Search, RefreshCw, FileText,
  Filter, Eye, ArrowUpRight, ShieldCheck, Check, X, AlertCircle
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import { getApprovalRequests, submitApprovalAction } from '../api/approvals';

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'];

export default function AdminApprovalCenter() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getApprovalRequests({ status: statusFilter, type: typeFilter || undefined });
      setItems(data || []);
      // If drawer is currently open, refresh the viewing object if still present
      if (viewing) {
        const found = (data || []).find((x) => x.id === viewing.id && x.requestType === viewing.requestType);
        if (found) setViewing(found);
      }
    } catch (err) {
      console.error('Failed to load approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const handleApprove = async (item) => {
    if (!window.confirm(`Approve ${item.typeLabel} "${item.title}" for ৳${Number(item.amount).toLocaleString()}?`)) return;
    try {
      setSubmitting(true);
      await submitApprovalAction({
        requestType: item.requestType,
        id: item.id,
        action: 'approved',
      });
      await loadData();
      if (viewing?.id === item.id) setViewing(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      setSubmitting(true);
      await submitApprovalAction({
        requestType: rejectionModal.requestType,
        id: rejectionModal.id,
        action: 'rejected',
        remarks: rejectionReason.trim(),
      });
      setRejectionModal(null);
      setRejectionReason('');
      await loadData();
      if (viewing?.id === rejectionModal.id) setViewing(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.reference || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.requestedBy || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <Topbar />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounting', to: '/dashboard/accounts' },
            { label: 'Admin Approval Center' },
          ]}
        />

        <div className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="text-blue-600" size={26} />
              Financial Approval Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review and authorize financial disbursement requests submitted by Accountants.
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition active:scale-95"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests, reference, requester..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="OfficeExpense">Office Expense</option>
                <option value="Expense">General Expense</option>
                <option value="PaymentVoucher">Payment Voucher</option>
                <option value="MonthlyBudget">Budget Allocation</option>
                <option value="PaySlip">Salary Disbursement</option>
              </select>

              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Request Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Request & Code</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Category / Purpose</th>
                  <th className="py-3.5 px-4">Requested By</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading requests...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No requests found under this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={`${item.requestType}-${item.id}`} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{item.reference}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {item.typeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">{item.requestedBy}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ৳ {Number(item.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewing(item)}
                            title="View Details"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Eye size={14} />
                          </button>
                          {item.status === 'pending' && (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprove(item)}
                                title="Approve Request"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs"
                              >
                                <Check size={14} strokeWidth={2.5} />
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => {
                                  setRejectionModal(item);
                                  setRejectionReason('');
                                }}
                                title="Reject Request"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Rejection Reason Modal (Higher z-index than Topbar) */}
      {rejectionModal && (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600" />
              Reject Financial Request
            </h3>
            <p className="text-xs text-slate-500 mt-1.5">
              Please specify the reason. This will be sent as a notification to the accountant so they can fix and re-submit.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing invoice attachment or exceeds budget allocation..."
              className="mt-3 w-full border border-slate-200 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !rejectionReason.trim()}
                onClick={handleRejectSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Slide-Over Drawer (z-[100000] to sit cleanly on top of Topbar) */}
      {viewing && (
        <div className="fixed inset-0 z-[100000] flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setViewing(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
          />

          {/* Slide Drawer Panel */}
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {viewing.reference}
                </span>
                <h2 className="text-lg font-bold tracking-tight text-white mt-0.5">
                  {viewing.typeLabel} Details
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

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Amount Card */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested Amount</p>
                  <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    ৳ {Number(viewing.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${
                  viewing.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : viewing.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {viewing.status}
                </span>
              </div>

              {/* General Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Submission Date</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {viewing.date ? new Date(viewing.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Category / Project</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{viewing.category || '—'}</p>
                </div>
              </div>

              {/* Title & Requester */}
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Title / Narration</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewing.title}</p>
                <p className="text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                  Submitted by: <span className="text-slate-800 font-semibold">{viewing.requestedBy}</span>
                </p>
              </div>

              {/* Accounting Accounts if Available */}
              {viewing.details && (viewing.details.drAccount || viewing.details.debitAccount) && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Accounting Ledger</h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                    <div className="px-4 py-3 bg-emerald-50/40 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-emerald-800 mr-2">DR</span>
                        <span className="text-slate-700">{viewing.details.drAccount || viewing.details.debitAccount}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">৳ {Number(viewing.amount).toLocaleString()}</span>
                    </div>
                    <div className="px-4 py-3 bg-slate-50/60 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-600 mr-2">CR</span>
                        <span className="text-slate-700">{viewing.details.crAccount || viewing.details.creditAccount}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">৳ {Number(viewing.amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachment if Available */}
              {viewing.attachment && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Supporting Attachment</h4>
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

            {/* Footer with Direct Approve / Reject inside Drawer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                {viewing.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleApprove(viewing)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs"
                    >
                      <Check size={14} strokeWidth={2.5} />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setRejectionModal(viewing);
                        setRejectionReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      <X size={14} strokeWidth={2.5} />
                      Reject
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}