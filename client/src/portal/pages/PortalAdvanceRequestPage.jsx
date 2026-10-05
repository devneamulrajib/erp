import { useEffect, useState } from 'react';
import { Banknote, Send } from 'lucide-react';
import { getEmployeeAdvances, requestEmployeeAdvance } from '../api/portalEmployee';
import PortalLayout from '../components/PortalLayout';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);

function nextMonthDefault() {
  const d = new Date();
  const m = d.getMonth() + 2;
  const year = d.getFullYear() + Math.floor((m - 1) / 12);
  const month = ((m - 1) % 12) + 1;
  return { year, month };
}

function StatusBadge({ status }) {
  const map = {
    Disbursed: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    Approved: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    Rejected: 'bg-red-50 text-red-600 ring-red-600/10',
    Pending: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    Completed: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '-'}
    </span>
  );
}

export default function PortalAdvanceRequestPage() {
  const def = nextMonthDefault();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('Advance Salary');
  const [amount, setAmount] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState(1);
  const [reason, setReason] = useState('');
  const [targetMonth, setTargetMonth] = useState(def.month);
  const [targetYear, setTargetYear] = useState(def.year);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const years = [def.year, def.year + 1];

  function load() {
    getEmployeeAdvances().then(setAdvances).catch(() => setAdvances([])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    setError('');
    try {
      await requestEmployeeAdvance({ type, amount, repaymentMonths, reason, targetMonth, targetYear });
      setAmount('');
      setReason('');
      setRepaymentMonths(1);
      const d = nextMonthDefault();
      setTargetMonth(d.month);
      setTargetYear(d.year);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Advance / Loan Requests</h1>
        <p className="text-sm text-slate-400 mt-0.5">Request an advance on salary or a loan</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-black/20 p-6 mb-8">
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition">
              <option value="Advance Salary">Advance Salary</option>
              <option value="Loan">Loan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition" placeholder="e.g. 5000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Repayment (months)</label>
            <input type="number" min="1" value={repaymentMonths} onChange={(e) => setRepaymentMonths(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Which month should this apply to?</label>
            <select value={targetMonth} onChange={(e) => setTargetMonth(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Year</label>
            <select value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Your deduction will start from this month's payroll onward — it will not affect any payroll before it.
        </p>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition" placeholder="e.g. Medical expense" />
        </div>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors">
          <Send size={14} />
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <Banknote size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Your Requests</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Monthly Deduction</th>
              <th className="px-4 py-3 text-left font-medium">Applies From</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : advances.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No requests yet</td></tr>
            ) : advances.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 text-slate-700">{a.type}</td>
                <td className="px-4 py-3 text-slate-700">৳{Number(a.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">৳{Number(a.monthlyDeduction || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">
                  {a.targetMonth && a.targetYear ? `${MONTHS[a.targetMonth - 1]} ${a.targetYear}` : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}