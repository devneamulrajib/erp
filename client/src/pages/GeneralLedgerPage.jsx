import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getReceivePaymentStatement } from '../api/accountingReports';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { Landmark, FileSpreadsheet } from 'lucide-react';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());

  const [rows, setRows] = useState([]);
  const [opening, setOpening] = useState({ debit: 0, credit: 0, balance: 0 });
  const [current, setCurrent] = useState({ debit: 0, credit: 0 });
  const [closing, setClosing] = useState({ debit: 0, credit: 0, balance: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => setAccounts([]));
  }, []);

  const load = useCallback(async () => {
    if (!account) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getReceivePaymentStatement({ account, from, to });
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setOpening(data.opening || { debit: 0, credit: 0, balance: 0 });
      setCurrent(data.current || { debit: 0, credit: 0 });
      setClosing(data.closing || { debit: 0, credit: 0, balance: 0 });
    } catch (err) {
      console.error('Failed to load general ledger', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [account, from, to]);

  useEffect(() => { load(); }, [load]);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportExcel() {
    const accName = accounts.find((a) => a.id === Number(account))?.name || 'account';
    const headers = ['Date', 'Voucher', 'Description', 'Debit', 'Credit', 'Balance', 'Note'];
    const csvRows = rows.map((r) => [
      new Date(r.date).toLocaleDateString(), r.voucherLabel, r.description,
      r.debit, r.credit, r.balance, r.note,
    ]);
    const csv = [headers, ...csvRows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${accName}_general_ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module (Report)', to: '/dashboard' },
              { label: 'General Ledger' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">General Ledger</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full transaction history for a single Chart of Account</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart Of Account</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date Range</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
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

        {!account ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Landmark size={28} strokeWidth={1.5} />
              <p className="text-sm">Select a Chart of Account above to view its ledger.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Opening Balance</div>
                <div className="text-lg font-semibold text-slate-900 font-mono">{formatMoney(opening.balance)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Debit</div>
                <div className="text-lg font-semibold text-emerald-600 font-mono">{formatMoney(current.debit)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Credit</div>
                <div className="text-lg font-semibold text-red-600 font-mono">{formatMoney(current.credit)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Closing Balance</div>
                <div className="text-lg font-semibold text-indigo-600 font-mono">{formatMoney(closing.balance)}</div>
              </div>
            </div>

            <div className="flex justify-end px-5 pt-4">
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
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Voucher</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Debit</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Credit</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No transactions in this period</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{r.voucherLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{r.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{r.debit ? formatMoney(r.debit) : ''}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{r.credit ? formatMoney(r.credit) : ''}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">{formatMoney(r.balance)}</td>
                      <td className="px-4 py-3 text-slate-500">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}