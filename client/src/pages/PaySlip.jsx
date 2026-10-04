import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getPaySlips, getPaySlip } from '../api/paySlip';
import { getEmployees } from '../api/employee';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString()}`;
}

function PaySlipDetail({ id, onClose }) {
  const [slip, setSlip] = useState(null);

  useEffect(() => {
    getPaySlip(id).then(setSlip).catch(() => setSlip(null));
  }, [id]);

  if (!slip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl print:shadow-none">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <h3 className="text-sm font-bold text-slate-900">Pay Slip</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
              <Printer size={14} />
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-lg font-bold text-slate-900">{slip.employee?.name}</p>
          <p className="text-xs text-slate-400">
            {slip.employee?.code} · {slip.employee?.designation || '-'} · {slip.employee?.department || '-'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {MONTHS[slip.month - 1]} {slip.year} · {slip.status === 'Paid' ? `Paid on ${slip.paidDate}` : 'Draft'}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div><p className="text-xs text-slate-400">Basic</p><p className="font-semibold text-slate-800">{fmt(slip.basicSalary)}</p></div>
          <div><p className="text-xs text-slate-400">House Rent</p><p className="font-semibold text-slate-800">{fmt(slip.houseRent)}</p></div>
          <div><p className="text-xs text-slate-400">Medical</p><p className="font-semibold text-slate-800">{fmt(slip.medicalAllowance)}</p></div>
          <div><p className="text-xs text-slate-400">Other</p><p className="font-semibold text-slate-800">{fmt(slip.otherAllowance)}</p></div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 py-2 text-sm">
          <span className="text-slate-500">Gross Salary</span>
          <span className="font-semibold text-slate-900">{fmt(slip.grossSalary)}</span>
        </div>

        {slip.advanceBreakdown?.length > 0 && (
          <div className="border-t border-slate-100 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Advance / Loan Deduction</p>
            {slip.advanceBreakdown.map((b) => (
              <div key={b.advanceId} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{b.type} #{b.advanceId}</span>
                <span className="text-amber-600">- {fmt(b.deduct)}</span>
              </div>
            ))}
          </div>
        )}

        {slip.deductions?.length > 0 && (
          <div className="border-t border-slate-100 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Other Deductions</p>
            {slip.deductions.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{d.title}</span>
                <span className="text-amber-600">- {fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {slip.additions?.length > 0 && (
          <div className="border-t border-slate-100 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Bonus / Addition</p>
            {slip.additions.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{d.title}</span>
                <span className="text-emerald-600">+ {fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm font-bold text-slate-900">Net Salary</span>
          <span className="text-xl font-bold text-emerald-600">{fmt(slip.netSalary)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PaySlip() {
  const now = new Date();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getEmployees().then((res) => setEmployees(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getPaySlips({ year, month, status, employeeId })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year, month, status, employeeId]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const selectCls = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400';

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Pay Slips</h1>
        <p className="mb-5 text-sm text-slate-500">Browse and review past salary payments.</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select className={selectCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
          </select>
          <select className={selectCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3 text-right">Gross</th>
                <th className="px-3 py-3 text-right">Deductions</th>
                <th className="px-3 py-3 text-right">Addition</th>
                <th className="px-3 py-3 text-right">Net</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No payslips found.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpenId(r.id)}
                  className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-800">{r.employee?.name}</p>
                    <p className="text-[10px] text-slate-400">{r.employee?.code}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{MONTHS[r.month - 1]} {r.year}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(r.grossSalary)}</td>
                  <td className="px-3 py-2.5 text-right text-amber-600">{fmt(r.totalDeduction)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600">{fmt(r.otherAddition)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">{fmt(r.netSalary)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {openId && <PaySlipDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}