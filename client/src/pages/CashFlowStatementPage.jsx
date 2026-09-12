import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getCashFlowStatement } from '../api/accountingReports';
import { Landmark, FileSpreadsheet } from 'lucide-react';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CashFlowStatementPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getCashFlowStatement({ from, to });
      setData(res);
    } catch (err) {
      console.error('Failed to load cash flow statement', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportExcel() {
    if (!data) return;
    const rows = [
      ['Opening Cash Balance', '', data.opening],
      ['', '', ''],
      ['Inflows', '', ''],
      ...data.inflows.map((i) => [i.section, '', i.amount]),
      ['Total Inflow', '', data.totalInflow],
      ['', '', ''],
      ['Outflows', '', ''],
      ...data.outflows.map((o) => [o.section, '', o.amount]),
      ['Total Outflow', '', data.totalOutflow],
      ['', '', ''],
      ['Net Change', '', data.netChange],
      ['Closing Cash Balance', '', data.closing],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash_flow_statement.csv';
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
              { label: 'Cash Flow Statement' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Cash Flow Statement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cash inflows and outflows across all bank accounts for the selected period</p>
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
        ) : !data ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">No data available.</div>
        ) : (
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="text-sm font-medium text-slate-600">Opening Cash Balance</span>
                <span className="font-mono font-semibold text-slate-900">{formatMoney(data.opening)}</span>
              </div>

              <h3 className="text-sm font-semibold text-emerald-700 mb-2">Cash Inflows (Receipts)</h3>
              <table className="w-full text-sm mb-6">
                <tbody className="divide-y divide-slate-100">
                  {data.inflows.length === 0 ? (
                    <tr><td className="py-3 text-slate-400 text-sm">No inflows in this period</td></tr>
                  ) : data.inflows.map((i) => (
                    <tr key={i.section}>
                      <td className="py-2 text-slate-700">{i.section}</td>
                      <td className="py-2 text-right font-mono text-slate-800">{formatMoney(i.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="py-2 text-slate-800">Total Inflow</td>
                    <td className="py-2 text-right font-mono text-emerald-700">{formatMoney(data.totalInflow)}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-red-700 mb-2">Cash Outflows (Payments)</h3>
              <table className="w-full text-sm mb-6">
                <tbody className="divide-y divide-slate-100">
                  {data.outflows.length === 0 ? (
                    <tr><td className="py-3 text-slate-400 text-sm">No outflows in this period</td></tr>
                  ) : data.outflows.map((o) => (
                    <tr key={o.section}>
                      <td className="py-2 text-slate-700">{o.section}</td>
                      <td className="py-2 text-right font-mono text-slate-800">{formatMoney(o.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="py-2 text-slate-800">Total Outflow</td>
                    <td className="py-2 text-right font-mono text-red-700">{formatMoney(data.totalOutflow)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mb-2">
                <span className="text-sm font-medium text-slate-600">Net Change in Cash</span>
                <span className={`font-mono font-semibold ${data.netChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatMoney(data.netChange)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-slate-300 pt-4">
                <span className="text-base font-semibold text-slate-900">Closing Cash Balance</span>
                <span className="text-lg font-bold font-mono text-indigo-700">{formatMoney(data.closing)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}