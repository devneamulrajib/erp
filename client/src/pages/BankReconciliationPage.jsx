import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getBankReconciliation, updateReconciliationStatus } from '../api/voucher';
import { getBankAccounts } from '../api/bankAccount';
import { Search, Landmark, CheckCircle2, XCircle, Clock } from 'lucide-react';

const VOUCHER_TYPES = ['Payment', 'Receipt', 'Contra'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function toLocalDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function monthStart() {
  const d = new Date();
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}
function todayStr() { return toLocalDateStr(new Date()); }

export default function BankReconciliationPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [bank, setBank] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBankReconciliation({
        from, to, account: bank || undefined, type: type || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load bank reconciliation', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, bank, type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getBankAccounts()
      .then((data) => setBanks(Array.isArray(data) ? data : []))
      .catch(() => setBanks([]));
  }, []);

  async function handleStatusChange(row, status) {
    setUpdatingId(row.id);
    try {
      const { data } = await updateReconciliationStatus(row.id, status);
      setRows((prev) => prev.map((r) => (r.id === row.id ? data : r)));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.voucherNo, r.bank?.name, r.narration]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  }), [rows, search]);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const honourCount = rows.filter((r) => r.reconciliationStatus === 'Honour').length;
  const dishonourCount = rows.filter((r) => r.reconciliationStatus === 'DisHonour').length;
  const pendingCount = rows.length - honourCount - dishonourCount;

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module' },
                { label: 'Bank Reconciliation' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Bank Reconciliation</h1>
            <p className="text-sm text-slate-500 mt-0.5">Match bank vouchers and mark them honoured or dishonoured</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Vouchers</div>
            <div className="text-xl font-semibold text-slate-900 font-mono">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Honoured</div>
            <div className="text-xl font-semibold text-emerald-600 font-mono">{honourCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Dishonoured</div>
            <div className="text-xl font-semibold text-red-600 font-mono">{dishonourCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Pending</div>
            <div className="text-xl font-semibold text-amber-600 font-mono">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Date</label>
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
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bank Account</label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select value</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select One Option</option>
                {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <button
                onClick={() => { setPage(1); load(); }}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors w-full"
              >
                <Landmark size={15} strokeWidth={2.5} />
                Report
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vouchers..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Voucher No</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Bank</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Cheque Date</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Note</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Landmark size={28} strokeWidth={1.5} />
                        <p className="text-sm">No data available in table</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/accounts-module/receipt-list/add?id=${row.id}`)}
                        className="text-indigo-600 font-medium hover:underline underline-offset-2 font-mono text-xs"
                      >
                        {row.voucherNo}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{row.narration || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-700">{row.bank?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {row.chequeDate ? new Date(row.chequeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-900">{formatMoney(row.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{row.chequeReceiptNo || ''}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <button
                          disabled={updatingId === row.id}
                          onClick={() => handleStatusChange(row, 'Honour')}
                          title="Honour"
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                            row.reconciliationStatus === 'Honour'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600'
                          }`}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          disabled={updatingId === row.id}
                          onClick={() => handleStatusChange(row, 'DisHonour')}
                          title="DisHonour"
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                            row.reconciliationStatus === 'DisHonour'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600'
                          }`}
                        >
                          <XCircle size={14} />
                        </button>
                        {!row.reconciliationStatus && (
                          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-500" title="Pending">
                            <Clock size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}