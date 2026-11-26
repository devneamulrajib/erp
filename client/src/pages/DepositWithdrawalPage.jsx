// client/src/pages/DepositWithdrawalPage.jsx
// Deposit & Withdrawal (Accounting). Records money coming into or going out of
// a Cash / Bank / MFS account. Each "Save & Post" creates a real Receipt
// (deposit) or Payment (withdrawal) voucher with a Dr and a Cr ledger line on
// the server (see server/routes/depositWithdrawal.js), so balances, Trial
// Balance, General Ledger and Cash & Bank Book all pick it up.
// The entry form is the shared DepositWithdrawalForm (also on the accountant's
// workspace). "Save Draft" keeps the unfinished form in this browser only.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Plus, CalendarDays, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Wallet,
  Building2, Smartphone, Banknote, CircleCheck, Info, ChevronRight, BookOpen, CircleAlert,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import ResponsiveTable from '../components/ResponsiveTable';
import DepositWithdrawalForm from '../components/DepositWithdrawalForm';
import { resolveFileUrl } from '../api/axios';
import { getDepositWithdrawalSummary, getDepositWithdrawals } from '../api/depositWithdrawal';

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-cobalt-400 focus:outline-none focus:ring-4 focus:ring-cobalt/10';
const cardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthStartStr = () => `${todayStr().slice(0, 8)}01`;
const taka = (n) => `৳${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const TYPE_STYLE = {
  Cash: { icon: Banknote, color: 'text-green-600', bg: 'bg-green-100' },
  Bank: { icon: Landmark, color: 'text-cobalt', bg: 'bg-cobalt-100' },
  MFS: { icon: Smartphone, color: 'text-violet-600', bg: 'bg-violet-100' },
};

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') {
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-600">Posted</span>;
  }
  if (s === 'rejected') {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">Rejected</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Pending</span>;
}

function TypeLabel({ kind }) {
  return kind === 'deposit' ? (
    <span className="inline-flex items-center gap-1 font-semibold text-green-600"><ArrowUp size={14} /> Deposit</span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-red-600"><ArrowDown size={14} /> Withdrawal</span>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value, valueClass = 'text-slate-900', caption, change, invertChange }) {
  const hasChange = change !== null && change !== undefined && Number.isFinite(change);
  const up = hasChange && change >= 0;
  const good = invertChange ? !up : up;
  return (
    <div className={`${cardClass} flex items-center gap-4 p-4 sm:p-5`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={`mt-0.5 truncate text-xl font-bold sm:text-2xl ${valueClass}`}>{value}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {caption}
          {hasChange && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? 'text-green-600' : 'text-red-600'}`}>
              {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function DepositWithdrawalPage() {
  const navigate = useNavigate();

  // filters
  const [fromDate, setFromDate] = useState(monthStartStr);
  const [toDate, setToDate] = useState(todayStr);
  const [accountType, setAccountType] = useState('all');

  // data
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // "New Transaction" clears the shared form and scrolls to it.
  const [newSignal, setNewSignal] = useState(0);

  // journal card: the last saved / clicked transaction
  const [journal, setJournal] = useState(null);
  const [justPosted, setJustPosted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const params = { from: fromDate || undefined, to: toDate || undefined, accountType };
    try {
      const [s, rows] = await Promise.all([
        getDepositWithdrawalSummary(params),
        getDepositWithdrawals({ ...params, limit: showAll ? 200 : 8 }),
      ]);
      setSummary(s);
      setRecent(rows);
      setJournal((j) => j || rows[0] || null);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, accountType, showAll]);

  useEffect(() => { loadData(); }, [loadData]);

  function handlePosted(saved) {
    setJournal(saved);
    setJustPosted(true);
    loadData();
  }

  const journalTotals = useMemo(() => {
    const entries = journal?.entries || [];
    return {
      debit: entries.reduce((s, e) => s + (Number(e.debit) || 0), 0),
      credit: entries.reduce((s, e) => s + (Number(e.credit) || 0), 0),
    };
  }, [journal]);

  const balanceColumns = [
    {
      key: 'name',
      label: 'Account Name',
      render: (a) => {
        const st = TYPE_STYLE[a.accountType] || TYPE_STYLE.Bank;
        const Icon = st.icon;
        return (
          <span className="inline-flex items-center gap-2 font-medium text-slate-900">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${st.bg}`}><Icon size={14} className={st.color} /></span>
            {a.name}
          </span>
        );
      },
    },
    { key: 'accountType', label: 'Account Type', render: (a) => <span className="text-slate-700">{a.accountType}</span> },
    { key: 'balance', label: 'Balance (৳)', render: (a) => <span className={`font-semibold ${a.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>{taka(a.balance)}</span> },
    { key: 'lastUpdated', label: 'Last Updated', render: (a) => <span className="text-slate-500">{fmtDate(a.lastUpdated)}</span> },
  ];

  const recentColumns = [
    { key: 'date', label: 'Date', render: (r) => <span className="whitespace-nowrap text-slate-700">{fmtDate(r.date)}</span> },
    { key: 'kind', label: 'Type', render: (r) => <TypeLabel kind={r.kind} /> },
    { key: 'amount', label: 'Amount (৳)', render: (r) => <span className="font-semibold text-slate-900">{taka(r.amount)}</span> },
    { key: 'accountName', label: 'Account', render: (r) => <span className="text-slate-700">{r.accountName || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 text-left">
      <Topbar />

      <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-5 sm:px-6 sm:py-6">
        {/* Filters + New Transaction (no title card) */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <CalendarDays size={16} className="shrink-0 text-slate-500" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="From date" />
            <span className="text-slate-500">–</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="To date" />
          </div>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={`${inputClass} sm:w-44`} aria-label="Account Type">
            <option value="all">All Accounts</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="mfs">MFS</option>
          </select>
          <button
            type="button"
            onClick={() => { setNewSignal((n) => n + 1); setJustPosted(false); }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-gold-600"
          >
            <Plus size={16} strokeWidth={2.5} /> New Transaction
          </button>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-600">
            <CircleAlert size={16} className="shrink-0" /> {loadError}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ArrowUp} iconColor="text-green-600" iconBg="bg-green-100"
            label="Total Deposit" value={taka(summary?.totalDeposit)}
            caption="Selected period" change={summary?.depositChange}
          />
          <StatCard
            icon={ArrowDown} iconColor="text-red-600" iconBg="bg-red-100"
            label="Total Withdrawal" value={taka(summary?.totalWithdrawal)} valueClass="text-red-600"
            caption="Selected period" change={summary?.withdrawalChange} invertChange
          />
          <StatCard
            icon={Wallet} iconColor="text-cobalt" iconBg="bg-cobalt-100"
            label="Cash Balance" value={taka(summary?.cashBalance)} caption="In Hand"
          />
          <StatCard
            icon={Building2} iconColor="text-violet-600" iconBg="bg-violet-100"
            label="Bank Balance" value={taka(summary?.bankBalance)}
            caption={summary?.mfsBalance ? `All Banks · MFS ${taka(summary.mfsBalance)}` : 'All Banks'}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left column: form + balances */}
          <div className="space-y-5 lg:col-span-7">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <h2 className="m-0 text-base font-bold text-slate-900">New Deposit / Withdrawal</h2>
              </div>
              <div className="p-4 sm:p-5">
                <DepositWithdrawalForm newSignal={newSignal} onPosted={handlePosted} />
              </div>
            </div>

            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
                <h2 className="m-0 text-base font-bold text-slate-900">Account Balances</h2>
                <span className="text-xs text-slate-500">{(summary?.accounts || []).length} accounts</span>
              </div>
              <div className="p-3 sm:p-4">
                <ResponsiveTable
                  columns={balanceColumns}
                  data={summary?.accounts || []}
                  rowKey="id"
                  emptyText={loading ? 'Loading...' : 'No accounts yet. Add one from Account Settings.'}
                />
                {(summary?.accounts || []).length > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-900">
                    <span>Total Balance</span>
                    <span>{taka(summary?.totalBalance)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5 lg:col-span-5">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
                <h2 className="m-0 text-base font-bold text-slate-900">Recent Transactions</h2>
                <button type="button" onClick={() => setShowAll((v) => !v)} className="inline-flex items-center gap-0.5 text-xs font-semibold text-cobalt hover:underline">
                  {showAll ? 'Show Less' : 'View All'} <ChevronRight size={14} />
                </button>
              </div>
              <div className={`p-3 sm:p-4 ${showAll ? 'max-h-[560px] overflow-y-auto' : ''}`}>
                <ResponsiveTable
                  columns={recentColumns}
                  data={recent}
                  rowKey="id"
                  onRowClick={(r) => { setJournal(r); setJustPosted(false); }}
                  emptyText={loading ? 'Loading...' : 'No deposits or withdrawals in this period'}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4 sm:flex-row sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/25 text-amber-700"><Info size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Need to manage multiple accounts?</p>
                <p className="mt-0.5 text-xs text-slate-700">You can add and manage your Cash, Bank and Mobile Financial Services (MFS) accounts from the Accounts Settings.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/accounts-module/bank-accounts')}
                className="shrink-0 rounded-md border border-gold bg-white px-3.5 py-2 text-xs font-semibold text-navy hover:bg-gold"
              >
                Go to Account Settings
              </button>
            </div>

            <div className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
                <h2 className="m-0 text-base font-bold text-slate-900">Journal Entry <span className="font-medium text-slate-500">(Auto Generated)</span></h2>
                {journal && <StatusPill status={journal.status} />}
              </div>
              {journal ? (
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">Voucher ID</p>
                      <p className="mt-0.5 font-mono font-semibold text-slate-900">{journal.voucherNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">Date</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{fmtDate(journal.date)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-700">
                          <th className="px-3 py-2">Account Head</th>
                          <th className="px-3 py-2 text-right">Debit (৳)</th>
                          <th className="px-3 py-2 text-right">Credit (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(journal.entries || []).map((e, i) => (
                          <tr key={`${e.accountId}-${i}`}>
                            <td className="px-3 py-2 text-slate-700">{e.accountName || `Account #${e.accountId}`}</td>
                            <td className="px-3 py-2 text-right text-slate-900">{e.debit ? taka(e.debit) : '-'}</td>
                            <td className="px-3 py-2 text-right text-slate-900">{e.credit ? taka(e.credit) : '-'}</td>
                          </tr>
                        ))}
                        <tr className="font-bold text-slate-900">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right">{taka(journalTotals.debit)}</td>
                          <td className="px-3 py-2 text-right">{taka(journalTotals.credit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <CircleCheck size={15} />
                      {justPosted ? 'Entry has been posted to ledger successfully.' : 'Entry is posted to the ledger.'}
                    </p>
                    <div className="flex items-center gap-2">
                      {journal.attachment && (
                        <a href={resolveFileUrl(journal.attachment)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cobalt hover:underline">Attachment</a>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(journal.kind === 'deposit' ? '/accounts-module/receipt-list' : '/accounts-module/payment-list')}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <BookOpen size={14} /> View Journal
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Post a transaction (or click one in Recent Transactions) to see its journal entry.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
