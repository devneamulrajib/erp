import { useEffect, useState } from 'react';
import { Wallet, Plus, Banknote, CheckCircle2, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import {
  previewPaySlips, generatePaySlips, getPaySlips, payPaySlip, addSalaryDeduction,
} from '../api/paySlip';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);

function fmt(n) {
  return `৳${Number(n || 0).toLocaleString()}`;
}

function AddAdjustmentModal({ employee, year, month, onClose, onSaved }) {
  const [type, setType] = useState('Deduction');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title (e.g. "Meal Bill" or "Eid Bonus")');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter an amount greater than 0');
      return;
    }

    setSaving(true);
    try {
      await addSalaryDeduction({
        employeeId: employee.employeeId, title: title.trim(), amount, month, year, note, type,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{employee.name} — {MONTHS[month - 1]} {year}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>

        <div className="mb-4 inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {['Deduction', 'Addition'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                type === t
                  ? t === 'Deduction' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t === 'Deduction' ? 'Deduction' : 'Bonus / Addition'}
            </button>
          ))}
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'Deduction' ? 'e.g. Meal Bill' : 'e.g. Eid Bonus'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <button type="submit" disabled={saving}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              type === 'Deduction' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}>
            {saving ? 'Saving…' : type === 'Deduction' ? 'Add Deduction' : 'Add Bonus'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PayModal({ title, onClose, onConfirm }) {
  const [accounts, setAccounts] = useState([]);
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/chart-of-accounts').then((res) => setAccounts(res.data || [])).catch(() => setAccounts([]));
  }, []);

  async function confirm() {
    if (!drAccount || !crAccount) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm({ drAccount, crAccount });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete payment');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        {error && <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Debit Account (Salary Expense)</label>
            <select value={drAccount} onChange={(e) => setDrAccount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Credit Account (Cash / Bank)</label>
            <select value={crAccount} onChange={(e) => setCrAccount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={confirm} disabled={busy}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Processing…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaySlipProcess() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState('preview'); // 'preview' | 'slips'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null); // 'all' or a single slip

  async function load() {
    setLoading(true);
    setError('');
    try {
      const slips = await getPaySlips({ year, month });
      if (slips.length) {
        setMode('slips');
        setRows(slips);
      } else {
        const preview = await previewPaySlips(year, month);
        setMode('preview');
        setRows(preview);
      }
    } catch {
      setError('Could not load payroll data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year, month]);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      await generatePaySlips(year, month);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate payslips');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay({ drAccount, crAccount }) {
    const targets = payTarget === 'all'
      ? rows.filter((r) => r.status === 'Draft')
      : [payTarget];
    for (const slip of targets) {
      await payPaySlip(slip.id, { drAccount, crAccount });
    }
    setPayTarget(null);
    await load();
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const selectCls = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400';
  const draftCount = mode === 'slips' ? rows.filter((r) => r.status === 'Draft').length : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payroll Processing</h1>
            <p className="text-sm text-slate-500">Generate and pay monthly salaries, with advances, deductions and bonuses applied.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className={selectCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className={selectCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 flex items-center gap-2">
          {mode === 'preview' && (
            <button onClick={handleGenerate} disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              <Wallet size={15} /> {generating ? 'Generating…' : 'Generate Draft Payslips'}
            </button>
          )}
          {mode === 'slips' && draftCount > 0 && (
            <button onClick={() => setPayTarget('all')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              <Banknote size={15} /> Pay All Draft ({draftCount})
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3 text-right">Gross</th>
                <th className="px-3 py-3 text-right">Advance Ded.</th>
                <th className="px-3 py-3 text-right">Other Ded.</th>
                <th className="px-3 py-3 text-right">Addition</th>
                <th className="px-3 py-3 text-right">Net Salary</th>
                {mode === 'slips' && <th className="px-3 py-3 text-center">Status</th>}
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No active employees found.</td></tr>
              )}
              {rows.map((r) => {
                const emp = mode === 'slips'
                  ? { employeeId: r.employeeId, name: r.employee?.name, code: r.employee?.code }
                  : r;
                return (
                  <tr key={r.employeeId || r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{emp.name}</p>
                      <p className="text-[10px] text-slate-400">{emp.code}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.grossSalary)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">{fmt(r.advanceDeduction)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">{fmt(r.otherDeduction)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmt(r.otherAddition)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900">{fmt(r.netSalary)}</td>
                    {mode === 'slips' && (
                      <td className="px-3 py-2.5 text-center">
                        {r.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">Draft</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        {(mode === 'preview' || r.status !== 'Paid') && (
                          <button onClick={() => setAdjustTarget(emp)} title="Add Deduction / Bonus"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
                            <Plus size={13} />
                          </button>
                        )}
                        {mode === 'slips' && r.status === 'Draft' && (
                          <button onClick={() => setPayTarget(r)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {adjustTarget && (
        <AddAdjustmentModal
          employee={adjustTarget}
          year={year}
          month={month}
          onClose={() => setAdjustTarget(null)}
          onSaved={() => { setAdjustTarget(null); load(); }}
        />
      )}
      {payTarget && (
        <PayModal
          title={payTarget === 'all' ? `Pay ${draftCount} Draft Payslips` : `Pay ${payTarget.employee?.name}`}
          onClose={() => setPayTarget(null)}
          onConfirm={handlePay}
        />
      )}
    </div>
  );
}