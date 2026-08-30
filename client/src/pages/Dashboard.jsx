import { useEffect, useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Package,
  Wrench,
  ShoppingCart,
  Receipt,
  ChevronRight,
  Star,
  Users,
  Calendar,
  Home,
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ExpenseDonut from '../components/ExpenseDonut';
import InflowOutflowChart from '../components/InflowOutflowChart';
import CommentsTable from '../components/CommentsTable';

const RANGES = [
  { key: '30d', label: '30 Days' },
  { key: '6m', label: '6 Months' },
  { key: '12m', label: '12 Months' },
];

const DEFAULT_TASKS = [
  { id: 1, label: 'Approve Purchase Order #4821', done: false },
  { id: 2, label: 'Review Skyline Tower budget', done: true },
  { id: 3, label: 'Sign vendor contract — BuildCo', done: false },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [flow, setFlow] = useState({ labels: [], inflow: [], outflow: [] });
  const [banks, setBanks] = useState({ accounts: [], total: 0 });
  const [properties, setProperties] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);
  const [range, setRange] = useState('12m');
  const [tasks, setTasks] = useState(DEFAULT_TASKS);

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

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  if (!summary) {
    return (
      <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-left">
      <Topbar />

      <div className="p-8 flex flex-col gap-6">
        {/* Greeting + range filter */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-2xl leading-8 tracking-tight text-neutral-950">
              Good morning{summary.userName ? `, ${summary.userName}` : ''}
            </h1>
            <p className="text-neutral-500 text-sm leading-5">
              Here is what is happening across your portfolio today.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs leading-4 rounded-md transition-colors ${
                  range === r.key
                    ? 'bg-neutral-900 text-neutral-50'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-neutral-900 text-neutral-50 border-neutral-900">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 opacity-80">Expenses</span>
              <TrendingDown className="size-4 opacity-80" />
            </div>
            <span className="font-bold text-xl leading-7">{summary.expenses}</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-white border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 text-neutral-500">Material Req.</span>
              <Package className="size-4" style={{ color: '#009689' }} />
            </div>
            <span className="font-bold text-xl leading-7">{summary.materialReq}</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-white border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 text-neutral-500">Service Req.</span>
              <Wrench className="size-4" style={{ color: '#f54900' }} />
            </div>
            <span className="font-bold text-xl leading-7">{summary.serviceReq}</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-white border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 text-neutral-500">Sales</span>
              <TrendingUp className="size-4" style={{ color: '#009689' }} />
            </div>
            <span className="font-bold text-xl leading-7">{summary.sales}</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-white border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 text-neutral-500">Purchases</span>
              <ShoppingCart className="size-4" style={{ color: '#fe9a00' }} />
            </div>
            <span className="font-bold text-xl leading-7">{summary.purchases}</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3 border bg-white border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-xs leading-4 text-neutral-500">Receipt</span>
              <Receipt className="size-4" style={{ color: '#104e64' }} />
            </div>
            <span className="font-bold text-xl leading-7">{summary.receipt}</span>
          </div>
        </div>

        {/* Active projects / charts / vouchers + quick tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Active Projects */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-sm leading-5">Active Projects</h2>
              <button className="text-neutral-500 text-xs leading-4 flex items-center gap-1 hover:text-neutral-900">
                View all
                <ChevronRight className="size-3" />
              </button>
            </div>
            <div className="max-h-[520px] overflow-y-auto pr-1">
              {projects.length === 0 && (
                <div className="text-neutral-400 text-sm text-center py-8">No projects yet</div>
              )}
              {projects.map((p) => (
                <div
                  key={p._id}
                  className="rounded-xl overflow-hidden border border-neutral-200 bg-white mb-4"
                >
                  <div className="relative h-28">
                    <img
                      alt={p.name}
                      className="object-cover w-full h-full"
                      src={p.image}
                    />
                    <div className="bg-gradient-to-t from-black/70 to-transparent absolute inset-0" />
                    <Star className="size-5 cursor-pointer absolute right-3 top-3 text-white" />
                    <div className="text-white absolute left-3 bottom-2">
                      <p className="font-semibold text-sm leading-5">{p.name}</p>
                      <p className="opacity-80 text-xs leading-4">{p.location}</p>
                    </div>
                  </div>
                  <div className="flex p-4 flex-col gap-3">
                    <div className="text-xs leading-4 flex justify-between items-center">
                      <span className="text-neutral-500">Progress</span>
                      <span className="font-semibold">{p.progress || 0}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neutral-900"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                    <div className="text-neutral-500 text-xs leading-4 flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {p.workers || 0} workers
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {p.dueDate ? `Due ${p.dueDate}` : 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm leading-5 font-semibold">Expense Breakdown</h3>
                <p className="text-neutral-500 text-xs leading-4">Last 12 months distribution</p>
              </div>
              <div className="flex justify-center">
                <ExpenseDonut data={expenseChart} />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm leading-5 font-semibold">Inflow vs Outflow</h3>
                <p className="text-neutral-500 text-xs leading-4">Cash movement overview</p>
              </div>
              <div className="flex justify-center">
                <InflowOutflowChart
                  labels={flow.labels}
                  inflow={flow.inflow}
                  outflow={flow.outflow}
                />
              </div>
            </div>
          </div>

          {/* Vouchers + Quick Tasks */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm leading-5 font-semibold">Pending Vouchers</h3>
                <span className="bg-[#e7000b] text-white text-xs leading-4 px-2 py-0.5 rounded-full">
                  {vouchers.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {vouchers.length === 0 && (
                  <p className="text-neutral-400 text-xs text-center py-4">No pending vouchers</p>
                )}
                {vouchers.map((v) => (
                  <div
                    key={v._id || v.code}
                    className="rounded-lg bg-neutral-100 flex p-3 justify-between items-center"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm leading-5">{v.code}</span>
                      <span className="text-neutral-500 text-xs leading-4">{v.description}</span>
                    </div>
                    <span className="font-semibold text-sm leading-5">
                      ${Number(v.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
                <button className="text-xs leading-4 w-full border border-neutral-200 rounded-lg py-2 hover:bg-neutral-50">
                  Review all vouchers
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm leading-5 font-semibold">Quick Tasks</h3>
                <p className="text-neutral-500 text-xs leading-4">
                  {tasks.filter((t) => !t.done).length} items to review
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="size-4 rounded border-neutral-300 accent-neutral-900"
                    />
                    <span className={t.done ? 'line-through text-neutral-400' : ''}>
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bank balances + unsold properties */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm leading-5 font-semibold">Bank Balances</h3>
                <p className="text-neutral-500 text-xs leading-4">Across all accounts</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-neutral-500 text-xs leading-4">Total balance</span>
                <span className="font-bold text-lg leading-7">
                  ${Number(banks.total).toLocaleString()}
                </span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 text-xs border-b border-neutral-200">
                  <th className="font-medium py-2">Account</th>
                  <th className="font-medium py-2">Bank</th>
                  <th className="font-medium py-2">Type</th>
                  <th className="font-medium py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {banks.accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-neutral-400 text-xs py-6">
                      No accounts found
                    </td>
                  </tr>
                )}
                {banks.accounts.map((acc) => (
                  <tr key={acc._id || acc.number} className="border-b border-neutral-100 last:border-0">
                    <td className="py-3 font-medium">****{acc.number}</td>
                    <td className="py-3">{acc.bank}</td>
                    <td className="py-3">
                      <span className="inline-block rounded-md bg-neutral-100 text-neutral-700 text-xs px-2 py-0.5">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-right">
                      ${Number(acc.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm leading-5 font-semibold">Unsold Properties</h3>
              <span className="border border-neutral-200 rounded-full text-xs leading-4 px-2 py-0.5">
                {properties.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {properties.length === 0 && (
                <p className="text-neutral-400 text-xs text-center py-4">No unsold properties</p>
              )}
              {properties.map((p) => (
                <div key={p._id || p.unit} className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-neutral-100 flex justify-center items-center shrink-0">
                    <Home className="size-4 text-neutral-900" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm leading-5 truncate">{p.unit}</span>
                    <span className="text-neutral-500 text-xs leading-4 truncate">
                      {p.project} · {p.type}
                    </span>
                  </div>
                  <span className="font-semibold text-sm leading-5 whitespace-nowrap">
                    ${Number(p.price).toLocaleString()}
                  </span>
                </div>
              ))}
              <button className="text-xs leading-4 w-full border border-neutral-200 rounded-lg py-2 hover:bg-neutral-50">
                View listings
              </button>
            </div>
          </div>
        </div>

        <CommentsTable comments={comments} />
      </div>
    </div>
  );
}