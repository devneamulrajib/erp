// client/src/components/workspace/AccountingWorkspace.jsx
// Accounting workspace, laid out like the Trikon "Deposit & Withdrawal" demo.
// All numbers are live: cash/bank book (period deposits, withdrawals and
// closing balances), latest receipt/payment vouchers and the latest journal.
// The "New Deposit / Withdrawal" card is the shared DepositWithdrawalForm: it
// posts a Receipt / Payment voucher straight to the ledger, with the Office
// Budget categories (and "Receive Cash") as transaction types. Other voucher
// types are still one click away under "New Transaction".
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileBarChart2,
  Landmark,
  Lightbulb,
  Plus,
  Receipt,
  Scale,
  Wallet,
} from 'lucide-react';
import api from '../../api/axios';
import DepositWithdrawalForm from '../DepositWithdrawalForm';
import { formatTaka } from '../dashboard/dashboardUtils';
import { EmptyState, ErrorState } from '../dashboard/DashboardKit';
import {
  SummaryCard,
  WCard,
  StatusPill,
  ViewAll,
  TableSkeleton,
  primaryButton,
  ghostButton,
  selectClass,
  listOf,
  shortDate,
  pctChange,
  rangeFor,
  RANGE_OPTIONS,
} from './workspaceKit';

const isCashAccount = (name) => /cash/i.test(String(name || ''));

const STATUS_TONE = { approved: ['green', 'Posted'], pending: ['amber', 'Pending'], rejected: ['red', 'Rejected'] };

export default function AccountingWorkspace() {
  const navigate = useNavigate();
  const [rangeKey, setRangeKey] = useState('month');
  const [accountType, setAccountType] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  // Bumped by "New Transaction" -> clears the entry form and scrolls to it.
  const [newSignal, setNewSignal] = useState(0);

  const [books, setBooks] = useState({ loading: true, error: null, now: [], prev: [] });
  const [recent, setRecent] = useState({ loading: true, error: null, rows: [] });
  const [journal, setJournal] = useState({ loading: true, error: null, voucher: null, names: {} });

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const loadBooks = useCallback(() => {
    setBooks((b) => ({ ...b, loading: true, error: null }));
    Promise.all([
      api.get('/accounting-reports/cash-bank-books', { params: { from: range.from, to: range.to } }),
      api.get('/accounting-reports/cash-bank-books', { params: { from: range.prevFrom, to: range.prevTo } }),
    ])
      .then(([a, b]) => setBooks({ loading: false, error: null, now: a.data?.books || [], prev: b.data?.books || [] }))
      .catch((e) => setBooks({ loading: false, error: e.response?.data?.message || e.message, now: [], prev: [] }));
  }, [range]);

  const loadRecent = useCallback(() => {
    setRecent((r) => ({ ...r, loading: true, error: null }));
    Promise.all([
      api.get('/vouchers', { params: { type: 'Receipt', page: 1, limit: 6 } }),
      api.get('/vouchers', { params: { type: 'Payment', page: 1, limit: 6 } }),
    ])
      .then(([r, p]) => {
        const rows = [...listOf(r.data), ...listOf(p.data)]
          .sort((x, y) => new Date(y.date || y.createdAt) - new Date(x.date || x.createdAt))
          .slice(0, 7);
        setRecent({ loading: false, error: null, rows });
      })
      .catch((e) => setRecent({ loading: false, error: e.response?.data?.message || e.message, rows: [] }));
  }, []);

  const loadJournal = useCallback(() => {
    setJournal((j) => ({ ...j, loading: true, error: null }));
    Promise.all([api.get('/journal-vouchers', { params: { page: 1, limit: 1 } }), api.get('/chart-of-accounts')])
      .then(([jv, coa]) => {
        const names = {};
        listOf(coa.data).forEach((a) => {
          names[String(a.id)] = a.name;
        });
        setJournal({ loading: false, error: null, voucher: listOf(jv.data)[0] || null, names });
      })
      .catch((e) => setJournal({ loading: false, error: e.response?.data?.message || e.message, voucher: null, names: {} }));
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);
  useEffect(() => {
    loadRecent();
    loadJournal();
  }, [loadRecent, loadJournal]);

  const keep = useCallback(
    (b) => accountType === 'all' || (accountType === 'cash' ? isCashAccount(b.bankName) : !isCashAccount(b.bankName)),
    [accountType],
  );

  const totals = useMemo(() => {
    const sum = (list, f) => list.filter(keep).reduce((s, b) => s + (Number(b[f]) || 0), 0);
    const cash = books.now.filter((b) => isCashAccount(b.bankName)).reduce((s, b) => s + (Number(b.closing) || 0), 0);
    const bank = books.now.filter((b) => !isCashAccount(b.bankName)).reduce((s, b) => s + (Number(b.closing) || 0), 0);
    const cashPrev = books.prev.filter((b) => isCashAccount(b.bankName)).reduce((s, b) => s + (Number(b.closing) || 0), 0);
    const bankPrev = books.prev.filter((b) => !isCashAccount(b.bankName)).reduce((s, b) => s + (Number(b.closing) || 0), 0);
    return {
      deposit: sum(books.now, 'periodDebit'),
      depositPrev: sum(books.prev, 'periodDebit'),
      withdrawal: sum(books.now, 'periodCredit'),
      withdrawalPrev: sum(books.prev, 'periodCredit'),
      cash,
      bank,
      cashPrev,
      bankPrev,
    };
  }, [books, keep]);

  const bankNames = useMemo(() => {
    const m = {};
    books.now.forEach((b) => {
      m[String(b.bankId)] = b.bankName;
    });
    return m;
  }, [books.now]);

  const balances = useMemo(
    () =>
      books.now.filter(keep).map((b) => ({
        id: b.bankId,
        name: b.bankName,
        type: isCashAccount(b.bankName) ? 'Cash' : 'Bank',
        balance: Number(b.closing) || 0,
        last: b.rows?.length ? b.rows[b.rows.length - 1].date : null,
      })),
    [books.now, keep],
  );
  const balanceTotal = balances.reduce((s, b) => s + b.balance, 0);

  const jv = journal.voucher;
  const jvLines = jv ? jv.JournalVoucherLines || jv.lines || [] : [];
  const accountName = (a) => journal.names[String(a)] || a || '—';

  return (
    <div className="space-y-6">
      {/* Filters + New Transaction (no title card) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <label className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} className={`${selectClass} w-full pl-9 sm:w-auto`} aria-label="Date range">
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={`${selectClass} w-full sm:w-auto`} aria-label="Account type">
          <option value="all">All accounts</option>
          <option value="cash">Cash accounts</option>
          <option value="bank">Bank accounts</option>
        </select>
        <div className="relative">
          <button type="button" className={`${primaryButton} w-full sm:w-auto`} onClick={() => setNewOpen((v) => !v)} aria-expanded={newOpen}>
            <Plus className="size-4" /> New Transaction
          </button>
          {newOpen && (
            <button type="button" aria-label="Close" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setNewOpen(false)} />
          )}
          {newOpen && (
            <div className="absolute right-0 z-30 mt-2 w-full sm:w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setNewOpen(false);
                  setNewSignal((n) => n + 1);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                <Wallet className="size-4 text-emerald-600" /> Deposit / Withdrawal
              </button>
              <div className="my-1 h-px bg-slate-100" />
              {[
                { label: 'Receipt Voucher (deposit)', to: '/accounts-module/receipt-list/add', icon: ArrowDownLeft },
                { label: 'Payment Voucher (withdrawal)', to: '/accounts-module/payment-list/add', icon: ArrowUpRight },
                { label: 'Contra Voucher', to: '/accounts-module/contra_list_add', icon: ArrowLeftRight },
                { label: 'Journal Entry', to: '/accounts-module/journal_list_add', icon: BookOpen },
                { label: 'Office Expense', to: '/accounts-module/office-expense', icon: Receipt },
              ].map((o) => (
                <button
                  key={o.to}
                  type="button"
                  onClick={() => navigate(o.to)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <o.icon className="size-4 text-slate-400" /> {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Deposit"
          value={formatTaka(totals.deposit)}
          icon={ArrowDownLeft}
          tone="green"
          change={books.loading ? undefined : pctChange(totals.deposit, totals.depositPrev)}
          hint="vs previous period"
          loading={books.loading}
          to="/accounts-module/receipt-list"
        />
        <SummaryCard
          label="Total Withdrawal"
          value={formatTaka(totals.withdrawal)}
          icon={ArrowUpRight}
          tone="red"
          change={books.loading ? undefined : pctChange(totals.withdrawal, totals.withdrawalPrev)}
          hint="vs previous period"
          loading={books.loading}
          to="/accounts-module/payment-list"
        />
        <SummaryCard
          label="Cash Balance"
          value={formatTaka(totals.cash)}
          icon={Banknote}
          tone="blue"
          hint="In hand"
          loading={books.loading}
          to="/accounts-module/reports/cash-bank-books"
        />
        <SummaryCard
          label="Bank Balance"
          value={formatTaka(totals.bank)}
          icon={Landmark}
          tone="purple"
          hint="All banks"
          loading={books.loading}
          to="/accounts-module/bank-accounts"
        />
      </div>
      {books.error && (
        <WCard>
          <ErrorState message={books.error} onRetry={loadBooks} />
        </WCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Quick entry */}
        <WCard title="New Deposit / Withdrawal" subtitle="Posts a receipt or payment voucher to the ledger" className="xl:col-span-2">
          <DepositWithdrawalForm
            newSignal={newSignal}
            onPosted={() => {
              loadBooks();
              loadRecent();
            }}
          />
        </WCard>

        {/* Recent transactions + tip */}
        <div className="space-y-6 xl:col-span-3">
          <WCard title="Recent Transactions" right={<ViewAll to="/accounts-module/reports/day-book" />} bodyClassName="">
            {recent.loading ? (
              <TableSkeleton rows={5} />
            ) : recent.error ? (
              <ErrorState message={recent.error} onRetry={loadRecent} />
            ) : recent.rows.length === 0 ? (
              <EmptyState icon={Receipt} title="No receipts or payments yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5">Account</th>
                      <th className="px-5 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recent.rows.map((v) => {
                      const deposit = v.type === 'Receipt';
                      const [tone, label] = STATUS_TONE[v.status] || ['slate', v.status || '—'];
                      return (
                        <tr
                          key={v.id}
                          onClick={() => navigate(deposit ? '/accounts-module/receipt-list' : '/accounts-module/payment-list')}
                          className="cursor-pointer hover:bg-slate-50/70"
                          title={`Open ${deposit ? 'receipt' : 'payment'} vouchers`}
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">{shortDate(v.date)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className={`inline-flex items-center gap-1 font-semibold ${deposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {deposit ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                              {deposit ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatTaka(v.amount)}</td>
                          <td className="max-w-[180px] truncate px-3 py-3 text-slate-600" title={v.narration || ''}>
                            {bankNames[String(v.bankId)] || v.paymentMethod || v.voucherNo}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            <StatusPill tone={tone}>{label}</StatusPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </WCard>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Lightbulb className="size-4" />
            </span>
            <div className="text-[13px] leading-relaxed text-emerald-900">
              <p className="font-bold">Tip</p>
              <p>
                Every receipt or payment posts its own journal automatically. Reconcile cheques in{' '}
                <Link className="font-semibold underline" to="/accounts-module/bank-reconciliation">Bank Reconciliation</Link> to keep bank
                balances exact.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Account balances */}
        <WCard title="Account Balances" subtitle={`Closing balance on ${shortDate(range.to)}`} right={<ViewAll to="/accounts-module/reports/cash-bank-books" />} className="xl:col-span-3" bodyClassName="">
          {books.loading ? (
            <TableSkeleton rows={4} />
          ) : balances.length === 0 ? (
            <EmptyState icon={Landmark} title="No cash or bank accounts" description="Add them under Accounting → Configuration → Bank Accounts." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2.5">Account Name</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                    <th className="px-5 py-2.5 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balances.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => navigate('/accounts-module/reports/cash-bank-books')}
                      className="cursor-pointer hover:bg-slate-50/70"
                      title="Open Cash/Bank Books"
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2.5 font-medium text-slate-800">
                          <span className={`flex size-8 items-center justify-center rounded-full ${b.type === 'Cash' ? 'bg-cobalt-100 text-cobalt' : 'bg-violet-100 text-violet-600'}`}>
                            {b.type === 'Cash' ? <Banknote className="size-4" /> : <Landmark className="size-4" />}
                          </span>
                          {b.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{b.type}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${b.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatTaka(b.balance)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">{shortDate(b.last)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80 font-bold">
                    <td className="px-5 py-3 text-slate-800" colSpan={2}>Total</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{formatTaka(balanceTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </WCard>

        {/* Latest journal entry */}
        <WCard
          title="Latest Journal Entry"
          subtitle={jv ? `${jv.voucherNo || 'Journal'} · ${shortDate(jv.date)}` : 'Auto-generated and manual journals'}
          right={jv ? <StatusPill tone={jv.status === 'approved' ? 'green' : jv.status === 'rejected' ? 'red' : 'amber'}>{jv.status === 'approved' ? 'Posted' : jv.status || 'pending'}</StatusPill> : null}
          className="xl:col-span-2"
        >
          {journal.loading ? (
            <TableSkeleton rows={3} />
          ) : journal.error ? (
            <ErrorState message={journal.error} onRetry={loadJournal} />
          ) : !jv ? (
            <EmptyState icon={BookOpen} title="No journal entries yet" />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-2">Account</th>
                    <th className="pb-2 text-right">Debit</th>
                    <th className="pb-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jvLines.map((l, i) => (
                    <tr key={l.id || i}>
                      <td className="max-w-[160px] truncate py-2.5 pr-2 text-slate-700">{accountName(l.account)}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-900">{Number(l.debit) ? formatTaka(l.debit) : '—'}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-900">{Number(l.credit) ? formatTaka(l.credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2.5 text-slate-800">Total</td>
                    <td className="py-2.5 text-right tabular-nums">{formatTaka(jv.totalDebit)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatTaka(jv.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
              {Math.abs((Number(jv.totalDebit) || 0) - (Number(jv.totalCredit) || 0)) < 0.01 && (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" /> Debits equal credits — this entry is balanced.
                </p>
              )}
              <Link to="/accounts-module/journal_list" className={`${ghostButton} mt-4 w-full`}>
                <BookOpen className="size-4 text-slate-400" /> View Journal
              </Link>
            </>
          )}
        </WCard>
      </div>

      {/* Shortcuts like the demo sidebar's Accounting group */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Daily Expense Entry', to: '/accounts-module/office-expense-list', icon: Receipt },
          { label: 'Journal Entry', to: '/accounts-module/journal_list', icon: BookOpen },
          { label: 'General Ledger', to: '/accounts-module/reports/general-ledger', icon: FileBarChart2 },
          { label: 'Trial Balance', to: '/accounts-module/reports/trial-balance', icon: Scale },
          { label: 'Income Statement', to: '/accounts-module/reports/income-statement', icon: FileBarChart2 },
          { label: 'Balance Sheet', to: '/accounts-module/reports/balance-sheet', icon: Landmark },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <q.icon className="size-4" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
