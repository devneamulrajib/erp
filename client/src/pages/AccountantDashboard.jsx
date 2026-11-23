// client/src/pages/AccountantDashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, Plus, Wallet,
  CreditCard, RefreshCw, AlertCircle, Calculator, Receipt, BookOpen, ListChecks, Inbox,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getApprovalRequests, getAccountantMetrics } from '../api/approvals';
import {
  DashboardHero, KpiCard, QuickLinks, ProgressBar, Skeleton, EmptyState, ErrorState, heroButton, heroButtonSolid,
} from '../components/dashboard/DashboardKit';
import { formatTaka, formatCount, greeting, currentStaffUser } from '../components/dashboard/dashboardUtils';

const QUICK_LINKS = [
  { label: 'Office Expense', to: '/accounts-module/office-expense', icon: Plus, accent: 'emerald' },
  { label: 'Payment Voucher', to: '/accounts-module/payment-list/add', icon: CreditCard, accent: 'violet' },
  { label: 'Receipt Voucher', to: '/accounts-module/receipt-list/add', icon: Receipt, accent: 'rose' },
  { label: 'Journal Voucher', to: '/accounts-module/journal_list_add', icon: BookOpen, accent: 'blue' },
  { label: 'Expense List', to: '/accounts-module/office-expense-list', icon: ListChecks, accent: 'amber' },
  { label: 'Accounts Dashboard', to: '/dashboard/accounts', icon: Wallet, accent: 'slate' },
];

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
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [m, reqs] = await Promise.all([
        getAccountantMetrics(),
        getApprovalRequests({ status: 'all' }),
      ]);
      if (m) setMetrics(m);
      if (reqs) setRequests(reqs.slice(0, 15)); // recent 15
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Could not load your requests right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const firstName = (currentStaffUser()?.name || '').split(' ')[0] || 'there';
  const total = Number(metrics.totalCount) || 0;
  const pct = (n) => (total ? Math.round((Number(n) / total) * 100) : 0);
  const approvalRate = pct(metrics.approvedCount);
  const amountPct = Number(metrics.totalRequested)
    ? Math.round((Number(metrics.totalApproved) / Number(metrics.totalRequested)) * 100)
    : 0;

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

        <div className="mt-3 mb-5">
          <DashboardHero
            tone="emerald"
            icon={Calculator}
            eyebrow="Accountant Hub"
            title={`${greeting()}, ${firstName}`}
            subtitle="Prepare vouchers, submit budget or expense requests, and track Admin approvals."
            stats={loading ? [] : [
              { label: 'Requested', value: formatTaka(metrics.totalRequested) },
              { label: 'Authorized', value: formatTaka(metrics.totalApproved) },
              { label: 'Approval Rate', value: `${approvalRate}%` },
            ]}
            actions={
              <>
                <button onClick={() => navigate('/accounts-module/office-expense')} className={heroButtonSolid}>
                  <Plus size={14} /> Office Expense
                </button>
                <button onClick={() => navigate('/accounts-module/payment-list/add')} className={heroButton}>
                  <CreditCard size={14} /> Payment Voucher
                </button>
              </>
            }
          />
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KpiCard label="Pending Review" icon={Clock} accent="amber" loading={loading}
            value={formatCount(metrics.pendingCount)} hint="Awaiting Admin decision" />
          <KpiCard label="Approved" icon={CheckCircle2} accent="emerald" loading={loading}
            value={formatCount(metrics.approvedCount)} hint="Finalized transactions" />
          <KpiCard label="Rejected" icon={XCircle} accent="rose" loading={loading}
            value={formatCount(metrics.rejectedCount)} hint="Needs review or fix" />
          <KpiCard label="Total Requested" icon={Wallet} accent="blue" loading={loading}
            value={formatTaka(metrics.totalRequested)} hint={`${formatTaka(metrics.totalApproved)} authorized`} />
        </div>

        {/* Decision split */}
        {!loading && Number(metrics.totalCount) > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Approval progress</span>
              <span className="text-slate-400">{formatCount(metrics.totalCount)} requests in total</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${pct(metrics.approvedCount)}%` }} />
              <div className="bg-amber-400" style={{ width: `${pct(metrics.pendingCount)}%` }} />
              <div className="bg-rose-500" style={{ width: `${pct(metrics.rejectedCount)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Approved {pct(metrics.approvedCount)}%</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Pending {pct(metrics.pendingCount)}%</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" /> Rejected {pct(metrics.rejectedCount)}%</span>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Amount authorized vs requested</p>
            <ProgressBar className="mt-1" value={amountPct} accent="blue" />
          </div>
        )}

        <div className="mb-5">
          <QuickLinks items={QUICK_LINKS} />
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
                {loading && requests.length === 0 ? (
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                    </tr>
                  ))
                ) : error && requests.length === 0 ? (
                  <tr>
                    <td colSpan={6}><ErrorState message={error} onRetry={loadData} /></td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Inbox} title="No requests submitted yet" description="Vouchers and expense requests you submit will appear here with their review status." />
                    </td>
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