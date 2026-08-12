import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import { getBankReconciliation, updateReconciliationStatus } from '../api/voucher';
import { getChartOfAccounts } from '../api/chartOfAccounts';

const VOUCHER_TYPES = ['Payment', 'Receipt', 'Contra'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function BankReconciliationPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBankReconciliation({
        from, to, account: account || undefined, type: type || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load bank reconciliation', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, account, type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getChartOfAccounts().then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
  }, []);

  async function handleStatusChange(row, status) {
    setUpdatingId(row._id);
    try {
      const { data } = await updateReconciliationStatus(row._id, status);
      setRows((prev) => prev.map((r) => (r._id === row._id ? data : r)));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.voucherNo, r.contact?.name, r.bank?.name, r.narration]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="text-sm text-gray-500 flex items-center gap-1 mb-4">
          <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
          <span>&gt;</span>
          <span className="text-indigo-600 flex items-center gap-0.5">Accounts Module <ChevronDown size={14} /></span>
          <span>&gt;</span>
          <span className="text-gray-700">Bank Reconciliation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Chart Of Account</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select value</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select One Option</option>
              {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <button
              onClick={() => { setPage(1); load(); }}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-6 py-2 rounded-md w-full sm:w-auto"
            >
              Report
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1">
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 text-sm">
            Search:
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap text-left">
                <th className="px-3 py-2 font-medium">SL</th>
                <th className="px-3 py-2 font-medium">VOUCHER NO</th>
                <th className="px-3 py-2 font-medium">DESCRIPTION</th>
                <th className="px-3 py-2 font-medium">BANK</th>
                <th className="px-3 py-2 font-medium">DATE</th>
                <th className="px-3 py-2 font-medium">CHEQUE DATE</th>
                <th className="px-3 py-2 font-medium text-right">AMOUNT</th>
                <th className="px-3 py-2 font-medium">NOTE</th>
                <th className="px-3 py-2 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : pageRows.map((row, i) => (
                <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap">
                  <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => navigate(`/accounts-module/receipt-list/add?id=${row._id}`)} className="text-indigo-600 font-medium hover:underline">
                      {row.voucherNo}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-indigo-600">{row.contact?.name || '-'}</td>
                  <td className="px-3 py-2 text-indigo-600">{row.bank?.name || '-'}</td>
                  <td className="px-3 py-2">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-3 py-2">{row.chequeDate ? new Date(row.chequeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(row.amount)}</td>
                  <td className="px-3 py-2">{row.narration || ''}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        disabled={updatingId === row._id}
                        onClick={() => handleStatusChange(row, 'Honour')}
                        className={`px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50 ${
                          row.reconciliationStatus === 'Honour' ? 'bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                        }`}
                      >
                        Honour
                      </button>
                      <button
                        disabled={updatingId === row._id}
                        onClick={() => handleStatusChange(row, 'DisHonour')}
                        className={`px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50 ${
                          row.reconciliationStatus === 'DisHonour' ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        DisHonour
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}