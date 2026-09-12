import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getIncomeStatement } from '../api/accountingReports';
import { Landmark, FileSpreadsheet } from 'lucide-react';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const REVENUE_HINT = /income|revenue|sale/i;
const EXPENSE_HINT = /expense|cost/i;

export default function IncomeStatementPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [sections, setSections] = useState([]);
  const [classification, setClassification] = useState({}); // { [sectionName]: 'revenue' | 'expense' | 'ignore' }
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getIncomeStatement({ from, to });
      const secs = Array.isArray(data.sections) ? data.sections : [];
      setSections(secs);
      setClassification((prev) => {
        const next = { ...prev };
        secs.forEach((s) => {
          if (next[s.section] !== undefined) return;
          if (REVENUE_HINT.test(s.section)) next[s.section] = 'revenue';
          else if (EXPENSE_HINT.test(s.section)) next[s.section] = 'expense';
          else next[s.section] = 'ignore';
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load income statement', err);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function setSectionClass(section, value) {
    setClassification((prev) => ({ ...prev, [section]: value }));
  }

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const revenueSections = sections.filter((s) => classification[s.section] === 'revenue');
  const expenseSections = sections.filter((s) => classification[s.section] === 'expense');
  const ignoredSections = sections.filter((s) => classification[s.section] === 'ignore');

  const totalRevenue = revenueSections.reduce((sum, s) => sum + s.net, 0);
  const totalExpense = expenseSections.reduce((sum, s) => sum + (-s.net), 0);
  const netProfit = totalRevenue - totalExpense;

  function exportExcel() {
    const rows = [
      ['Section', 'Type', 'Amount'],
      ...revenueSections.map((s) => [s.section, 'Revenue', s.net]),
      ...expenseSections.map((s) => [s.section, 'Expense', -s.net]),
      ['Total Revenue', '', totalRevenue],
      ['Total Expense', '', totalExpense],
      ['Net Profit', '', netProfit],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'income_statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module (Report)', to: '/dashboard' },
              { label: 'Income Statement' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Income Statement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue vs expense for the selected period, by Chart of Group section</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <button
                onClick={() => load()}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors w-full"
              >
                <Landmark size={15} strokeWidth={2.5} />
                Report
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">
            No transactions in this period.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Classify sections</h2>
              <p className="text-xs text-slate-500 mb-4">
                Section names come from your Chart of Group's top-level names. Mark each as Revenue, Expense, or ignore (e.g. Asset/Liability sections shouldn't be in a P&amp;L).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sections.map((s) => (
                  <div key={s.section} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-700">{s.section}</span>
                    <select
                      value={classification[s.section] || 'ignore'}
                      onChange={(e) => setSectionClass(s.section, e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="expense">Expense</option>
                      <option value="ignore">Ignore</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex justify-end px-5 pt-4">
                <button
                  onClick={exportExcel}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>

              <div className="p-5">
                <h3 className="text-sm font-semibold text-emerald-700 mb-2">Revenue</h3>
                <table className="w-full text-sm mb-6">
                  <tbody className="divide-y divide-slate-100">
                    {revenueSections.length === 0 ? (
                      <tr><td className="py-3 text-slate-400 text-sm">No sections marked as Revenue</td></tr>
                    ) : revenueSections.map((s) => (
                      <tr key={s.section}>
                        <td className="py-2 text-slate-700">{s.section}</td>
                        <td className="py-2 text-right font-mono text-slate-800">{formatMoney(s.net)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="py-2 text-slate-800">Total Revenue</td>
                      <td className="py-2 text-right font-mono text-emerald-700">{formatMoney(totalRevenue)}</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="text-sm font-semibold text-red-700 mb-2">Expense</h3>
                <table className="w-full text-sm mb-6">
                  <tbody className="divide-y divide-slate-100">
                    {expenseSections.length === 0 ? (
                      <tr><td className="py-3 text-slate-400 text-sm">No sections marked as Expense</td></tr>
                    ) : expenseSections.map((s) => (
                      <tr key={s.section}>
                        <td className="py-2 text-slate-700">{s.section}</td>
                        <td className="py-2 text-right font-mono text-slate-800">{formatMoney(-s.net)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="py-2 text-slate-800">Total Expense</td>
                      <td className="py-2 text-right font-mono text-red-700">{formatMoney(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex items-center justify-between border-t-2 border-slate-300 pt-4">
                  <span className="text-base font-semibold text-slate-900">Net Profit</span>
                  <span className={`text-lg font-bold font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatMoney(netProfit)}
                  </span>
                </div>

                {ignoredSections.length > 0 && (
                  <p className="text-xs text-slate-400 mt-4">
                    Ignored: {ignoredSections.map((s) => s.section).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}