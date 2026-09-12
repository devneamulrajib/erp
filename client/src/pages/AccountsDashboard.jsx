import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, BookOpen, ChevronRight, CreditCard, FileCheck2,
  Landmark, PieChart, Receipt, RefreshCw, ShoppingCart, TrendingUp, WalletCards
} from 'lucide-react';

import AccountsSubNav from '../components/AccountsSubNav';
import BankBalanceTable from '../components/BankBalanceTable';
import ExpenseDonut from '../components/ExpenseDonut';
import InflowOutflowChart from '../components/InflowOutflowChart';
import PendingChequeTable from '../components/PendingChequeTable';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import Topbar from '../components/Topbar';
import api from '../api/axios';

const cards = [
  ['totalExpense', 'Total Expense', WalletCards],
  ['payment', 'Payment', CreditCard],
  ['sales', 'Sales', TrendingUp],
  ['purchases', 'Purchases', ShoppingCart],
  ['receipt', 'Receipt', Receipt],
  ['journal', 'Journal', BookOpen],
];

const emptyFlow = { labels: [], inflow: [], outflow: [] };

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const Panel = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)] ${className}`}>
    {children}
  </section>
);

const PanelTitle = ({ icon: Icon, title, subtitle, count }) => (
  <div className="flex items-center justify-between gap-3 px-5 py-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {count !== undefined && (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
        {count}
      </span>
    )}
  </div>
);

export default function AccountsDashboard() {
  const [summary, setSummary] = useState(null);
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [cheques, setCheques] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState(emptyFlow);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const [
        summaryRes, banksRes, vouchersRes,
        expenseRes, flowRes, chequesRes
      ] = await Promise.all([
        api.get('/dashboard/accounts-summary'),
        api.get('/dashboard/bank-balances'),
        api.get('/dashboard/pending-vouchers'),
        api.get('/dashboard/expense-chart'),
        api.get('/dashboard/inflow-outflow'),
        api.get('/dashboard/pending-cheques'),
      ]);

      setSummary(summaryRes.data || {});
      setBanks(banksRes.data || { accounts: [], total: 0 });
      setVouchers(Array.isArray(vouchersRes.data) ? vouchersRes.data : []);
      setExpenseChart(Array.isArray(expenseRes.data) ? expenseRes.data : []);
      setFlow(flowRes.data || emptyFlow);
      setCheques(Array.isArray(chequesRes.data) ? chequesRes.data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load accounts dashboard:', err);
      const status = err?.response?.status ? ` (${err.response.status})` : '';
      setError(err?.response?.data?.message || `Unable to load dashboard data${status}.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const refreshCheques = useCallback(() => {
    api.get('/dashboard/pending-cheques')
      .then(res => setCheques(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to refresh cheques:', err));
  }, []);

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Topbar />
        <AccountsSubNav />
        <main className="mx-auto max-w-4xl px-4 py-12">
          <Panel>
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle size={26} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Dashboard unavailable</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
              <button onClick={() => loadDashboard()} className="mt-6 flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
                <RefreshCw size={15} /> Try again
              </button>
            </div>
          </Panel>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <Topbar />
      <AccountsSubNav />

      <main className="mx-auto max-w-[1550px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span>Home</span><ChevronRight size={12}/><span>Accounting</span>
              <ChevronRight size={12}/><span className="font-semibold text-slate-600">Dashboard</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Accounts Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor your financial activity, balances and pending work.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 sm:block">
                Updated <b className="text-slate-700">
                  {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </b>
              </span>
            )}
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map(([key, label, Icon], i) => (
            <div
              key={key}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon size={16}/>
                </div>
                <span className="text-[10px] font-bold text-slate-300">0{i + 1}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              {loading
                ? <Skeleton className="mt-2 h-7 w-20"/>
                : <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">
                    {Number(summary?.[key] ?? 0).toLocaleString()}
                  </p>
              }
            </div>
          ))}
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="flex flex-col gap-5 xl:col-span-4">
            <Panel>
              <PanelTitle icon={Landmark} title="Bank Balances" subtitle="Current account balances" count={banks.accounts.length}/>
              <div className="border-t border-slate-100 p-4">
                {loading
                  ? <Skeleton className="h-52 w-full"/>
                  : <BankBalanceTable accounts={banks.accounts} total={banks.total}/>
                }
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={FileCheck2} title="Pending Cheques" subtitle="Awaiting clearance" count={cheques.length}/>
              <div className="border-t border-slate-100 p-4">
                {loading
                  ? <Skeleton className="h-52 w-full"/>
                  : <PendingChequeTable cheques={cheques} onUpdated={refreshCheques}/>
                }
              </div>
            </Panel>
          </div>

          <div className="flex flex-col gap-5 xl:col-span-5">
            <Panel>
              <PanelTitle icon={PieChart} title="Expense Overview" subtitle="Distribution over the last 12 months"/>
              <div className="border-t border-slate-100 px-5 py-5">
                {loading ? (
                  <div className="flex h-[290px] items-center justify-center">
                    <Skeleton className="h-52 w-52 rounded-full"/>
                  </div>
                ) : expenseChart.length ? (
                  <div className="flex min-h-[290px] items-center justify-center">
                    <ExpenseDonut data={expenseChart}/>
                  </div>
                ) : (
                  <div className="flex h-[290px] items-center justify-center text-sm text-slate-400">
                    No expense data available.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={TrendingUp} title="Inflow vs Outflow" subtitle="Cash movement comparison"/>
              <div className="border-t border-slate-100 px-5 py-5">
                {loading ? (
                  <Skeleton className="h-[280px] w-full"/>
                ) : flow?.labels?.length ? (
                  <InflowOutflowChart labels={flow.labels} inflow={flow.inflow} outflow={flow.outflow}/>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
                    No cash-flow data available.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-3">
            <Panel className="xl:sticky xl:top-5">
              <PanelTitle
                icon={FileCheck2}
                title="Pending Vouchers"
                subtitle="Items requiring attention"
                count={vouchers.length}
              />
              <div className="border-t border-slate-100 p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full"/> )}
                  </div>
                ) : vouchers.length ? (
                  <PendingVoucherPanel vouchers={vouchers}/>
                ) : (
                  <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <FileCheck2 size={21}/>
                    </div>
                    <p className="text-sm font-bold text-slate-900">All caught up</p>
                    <p className="mt-1 max-w-[210px] text-xs leading-5 text-slate-400">
                      There are no pending vouchers requiring attention.
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
