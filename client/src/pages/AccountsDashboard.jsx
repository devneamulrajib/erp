import { useEffect, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import AccountsSubNav from '../components/AccountsSubNav';
import StatCard from '../components/StatCard';
import BankBalanceTable from '../components/BankBalanceTable';
import PendingChequeTable from '../components/PendingChequeTable';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import ExpenseDonut from '../components/ExpenseDonut';
import InflowOutflowChart from '../components/InflowOutflowChart';
import api from '../api/axios';

const STAT_CARDS = [
  { key: 'totalExpense', label: 'Total Expense', colorFrom: '#8a6d1a', colorTo: '#6b5313' },
  { key: 'payment', label: 'Payment', colorFrom: '#0f9b8e', colorTo: '#0c6b63' },
  { key: 'sales', label: 'Sales', colorFrom: '#0f7a4a', colorTo: '#0a5533' },
  { key: 'purchases', label: 'Purchases', colorFrom: '#c2185b', colorTo: '#8e1046' },
  { key: 'receipt', label: 'Receipt', colorFrom: '#e05a3a', colorTo: '#c1401f' },
  { key: 'journal', label: 'Journal', colorFrom: '#1d5f7a', colorTo: '#123f52' },
];

export default function AccountsDashboard() {
  const [summary, setSummary] = useState(null);
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [cheques, setCheques] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });

  const loadCheques = useCallback(() => {
    api.get('/dashboard/pending-cheques').then((r) => setCheques(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    api.get('/dashboard/accounts-summary').then((r) => setSummary(r.data)).catch(console.error);
    api.get('/dashboard/bank-balances').then((r) => setBanks(r.data)).catch(console.error);
    api.get('/dashboard/pending-vouchers').then((r) => setVouchers(r.data)).catch(console.error);
    api.get('/dashboard/expense-chart').then((r) => setExpenseChart(r.data)).catch(console.error);
    api.get('/dashboard/inflow-outflow').then((r) => setFlow(r.data)).catch(console.error);
    loadCheques();
  }, [loadCheques]);

  return (
    <div className="min-h-screen w-full bg-neutral-50">
      <Topbar />
      <AccountsSubNav />

      <div className="p-6 flex flex-col gap-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_CARDS.map((c) => (
            <StatCard
              key={c.key}
              label={c.label}
              value={summary ? Number(summary[c.key] ?? 0).toLocaleString() : '...'}
              colorFrom={c.colorFrom}
              colorTo={c.colorTo}
            />
          ))}
        </div>

        {/* Main grid: bank balances + cheques | charts | pending vouchers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="flex flex-col gap-4">
            <BankBalanceTable accounts={banks.accounts} total={banks.total} />
            <PendingChequeTable cheques={cheques} onUpdated={loadCheques} />
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-center font-semibold">Expense</h3>
              <p className="text-center text-xs text-gray-400 mb-2">Last 12 Months</p>
              <div className="flex justify-center">
                <ExpenseDonut data={expenseChart} />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold mb-2">Inflow vs Outflow</h3>
              <div className="flex justify-center">
                <InflowOutflowChart labels={flow.labels} inflow={flow.inflow} outflow={flow.outflow} />
              </div>
            </div>
          </div>

          <PendingVoucherPanel vouchers={vouchers} />
        </div>
      </div>
    </div>
  );
}