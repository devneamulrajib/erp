// client/src/pages/AccountantDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, Plus, Wallet, FileText,
  CreditCard, RefreshCw, AlertCircle
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getApprovalRequests, getAccountantMetrics } from '../api/approvals';

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
    totalRequested: 0,
    totalApproved: 0,
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, reqs] = await Promise.all([
        getAccountantMetrics(),
        getApprovalRequests({ status: 'all' }),
      ]);
      if (m) setMetrics(m);
      if (reqs) setRequests(reqs.slice(0, 15)); // recent 15
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <Topbar />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accountant Hub' },
          ]}
        />

        <div className="mt-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Accountant Request Hub
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Prepare vouchers, submit budget or expense requests, and track Admin approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/accounts-module/office-expense')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs transition"
            >
              <Plus size={14} />
              Office Expense
            </button>
            <button
              onClick={() => navigate('/accounts-module/payment-list/add')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition"
            >
              <CreditCard size={14} />
              Payment Voucher
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
              <Clock size={18} />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900">{metrics.pendingCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting Admin decision</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved</span>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900">{metrics.approvedCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Finalized transactions</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected</span>
              <XCircle size={18} />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900">{metrics.rejectedCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Needs review or fix</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Requested</span>
              <Wallet size={18} />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900">
              ৳ {Number(metrics.totalRequested).toLocaleString('en-BD', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">
              ৳ {Number(metrics.totalApproved).toLocaleString('en-BD', { maximumFractionDigits: 0 })} authorized
            </p>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Request Submissions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Track live review status from Admin</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Request Type</th>
                  <th className="py-3 px-4">Title / Purpose</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No requests submitted yet.</td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={`${r.requestType}-${r.id}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{r.reference}</td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">{r.typeLabel}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{r.title}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ৳ {Number(r.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          r.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {r.status === 'rejected' ? (
                          <span className="text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle size={12} />
                            {r.remarks || 'Reason not specified'}
                          </span>
                        ) : (
                          r.remarks || '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}