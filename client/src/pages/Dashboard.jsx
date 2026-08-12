import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import StatCard from '../components/StatCard';
import ProjectCard from '../components/ProjectCard';
import ExpenseDonut from '../components/ExpenseDonut';
import InflowOutflowChart from '../components/InflowOutflowChart';
import BankBalanceTable from '../components/BankBalanceTable';
import UnsoldPropertyList from '../components/UnsoldPropertyList';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import CommentsTable from '../components/CommentsTable';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [properties, setProperties] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data));
    api.get('/dashboard/projects').then((r) => setProjects(r.data));
    api.get('/dashboard/expense-chart').then((r) => setExpenseChart(r.data));
    api.get('/dashboard/inflow-outflow').then((r) => setFlow(r.data));
    api.get('/dashboard/bank-balances').then((r) => setBanks(r.data));
    api.get('/dashboard/unsold-properties').then((r) => setProperties(r.data));
    api.get('/dashboard/pending-vouchers').then((r) => setVouchers(r.data));
    api.get('/dashboard/comments').then((r) => setComments(r.data));
  }, []);

  if (!summary) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <StatCard label="Expenses" value={summary.expenses} colorFrom="#78350f" colorTo="#374151" />
          <StatCard label="Material Req." value={summary.materialReq} colorFrom="#065f46" colorTo="#134e4a" />
          <StatCard label="Service Req." value={summary.serviceReq} colorFrom="#be185d" colorTo="#9d174d" />
          <StatCard label="Sales" value={summary.sales} colorFrom="#f97316" colorTo="#dc2626" />
          <StatCard label="Purchases" value={summary.purchases} colorFrom="#0ea5e9" colorTo="#0369a1" />
          <StatCard label="Receipt" value={summary.receipt} colorFrom="#0ea5e9" colorTo="#0369a1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
          <div className="max-h-[520px] overflow-y-auto pr-1">
            {projects.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No projects yet</div>}
            {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-center mb-1">Expense</h3>
            <p className="text-center text-gray-400 text-xs mb-2">Last 12 Months</p>
            <div className="flex justify-center">
              <ExpenseDonut data={expenseChart} />
            </div>
            <h3 className="font-semibold mt-4 mb-2">Inflow vs Outflow</h3>
            <div className="flex justify-center">
              <InflowOutflowChart labels={flow.labels} inflow={flow.inflow} outflow={flow.outflow} />
            </div>
          </div>

          <PendingVoucherPanel vouchers={vouchers} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <BankBalanceTable accounts={banks.accounts} total={banks.total} />
          </div>
          <div>
            <UnsoldPropertyList properties={properties} />
          </div>
        </div>

        <CommentsTable comments={comments} />
      </div>
    </div>
  );
}