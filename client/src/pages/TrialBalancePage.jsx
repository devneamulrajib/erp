import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getTrialBalance } from '../api/accountingReports';
import { Landmark, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [balanced, setBalanced] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getTrialBalance({ asOf });
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotalDebit(data.totalDebit || 0);
      setTotalCredit(data.totalCredit || 0);
      setBalanced(!!data.balanced);
    } catch (err) {
      console.error('Failed to load trial balance', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportExcel() {
    const headers = ['Code', 'Account', 'Debit', 'Credit'];
    const csvRows = rows.map((r) => [r.code, r.name, r.debitBalance, r.creditBalance]);
    csvRows.push(['', 'Total', totalDebit, totalCredit]);
    const csv = [headers, ...csvRows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial_balance.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module (Report)', to: '/dashboard' },
              { label: 'Trial Balance' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Trial Balance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Closing debit/credit balance per account, as of a chosen date</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">As Of</label>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                onClick={() => load()}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
              >
                <Landmark size={15} strokeWidth={2.5} />
                Report
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className={`inline-flex items-center gap-2 text-sm font-medium ${balanced ? 'text-emerald-700' : 'text-red-700'}`}>
                {balanced ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {balanced ? 'Balanced' : `Out of balance by ${formatMoney(Math.abs(totalDebit - totalCredit))}`}
              </div>
              <button
                onClick={exportExcel}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>

            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Account</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Debit</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No account activity as of this date</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.code}</td>
                      <td className="px-4 py-3 text-slate-700">{r.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">{r.debitBalance ? formatMoney(r.debitBalance) : ''}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">{r.creditBalance ? formatMoney(r.creditBalance) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{formatMoney(totalDebit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{formatMoney(totalCredit)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}