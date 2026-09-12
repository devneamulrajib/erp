import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getCashBankBooks } from '../api/accountingReports';
import { getBankAccounts } from '../api/bankAccount';
import { Landmark, FileSpreadsheet } from 'lucide-react';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CashBankBookPage() {
  const [banks, setBanks] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bank, setBank] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [voucherType, setVoucherType] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCashBankBooks({
        bank: bank || undefined,
        from,
        to,
        voucherType: voucherType || undefined,
      });
      setBooks(Array.isArray(data.books) ? data.books : []);
      setActiveTab(0);
    } catch (err) {
      console.error('Failed to load cash/bank books', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [bank, from, to, voucherType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getBankAccounts().then((data) => setBanks(data || [])).catch(() => setBanks([]));
  }, []);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportExcel(book) {
    const headers = ['Date', 'Voucher', 'Description', 'Debit', 'Credit', 'Balance', 'Note'];
    const rows = book.rows.map((r) => [
      new Date(r.date).toLocaleDateString(), r.voucherLabel, r.description,
      r.debit, r.credit, r.balance, r.note,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.bankName}_cash_bank_book.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const current = books[activeTab];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module (Report)', to: '/dashboard' },
              { label: 'Cash/Bank Books' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Cash/Bank Books</h1>
          <p className="text-sm text-slate-500 mt-0.5">Running ledger per bank account, with opening/closing balances</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bank Account</label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">All Bank Accounts</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Voucher Type</label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">All Voucher Types</option>
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
              </select>
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
        ) : books.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Landmark size={28} strokeWidth={1.5} />
              <p className="text-sm">No bank accounts found. Add one under Bank Reconciliation to get started.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 px-5 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
              {books.map((b, i) => (
                <button
                  key={b.bankId}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    i === activeTab ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {b.bankName}
                </button>
              ))}
            </div>

            {current && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Opening Balance</div>
                    <div className="text-lg font-semibold text-slate-900 font-mono">{formatMoney(current.opening)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Debit</div>
                    <div className="text-lg font-semibold text-emerald-600 font-mono">{formatMoney(current.periodDebit)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Credit</div>
                    <div className="text-lg font-semibold text-red-600 font-mono">{formatMoney(current.periodCredit)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Closing Balance</div>
                    <div className="text-lg font-semibold text-indigo-600 font-mono">{formatMoney(current.closing)}</div>
                  </div>
                </div>

                <div className="flex justify-end px-5 pt-4">
                  <button
                    onClick={() => exportExcel(current)}
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
                      {current.rows.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No transactions in this period</td></tr>
                      ) : current.rows.map((r, i) => (
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}