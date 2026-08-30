import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { getReceivePaymentStatement } from '../api/accountingReports';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getProjects } from '../api/project';

const VOUCHER_TYPES = ['Journal', 'Payment', 'Receipt', 'Contra', 'Expense', 'Purchase', 'Sales'];

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function ReceivePaymentStatementPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [opening, setOpening] = useState({ debit: 0, credit: 0, balance: 0 });
  const [current, setCurrent] = useState({ debit: 0, credit: 0 });
  const [closing, setClosing] = useState({ debit: 0, credit: 0, balance: 0 });
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [accountId, setAccountId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [exceptContra, setExceptContra] = useState(false);
  const [search, setSearch] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);

  const load = useCallback(async () => {
    if (!accountId) { setRows([]); return; }
    setLoading(true);
    try {
      const { data } = await getReceivePaymentStatement({
        account: accountId, from, to,
        project: projectId || undefined,
        voucherType: voucherType || undefined,
        exceptContra: exceptContra || undefined,
      });
      setRows(data.rows);
      setOpening(data.opening);
      setCurrent(data.current);
      setClosing(data.closing);
    } catch (err) {
      console.error('Failed to load receive payment statement', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to, projectId, voucherType, exceptContra]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getChartOfAccounts().then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    getProjects().then(({ data }) => setProjects(data)).catch(() => setProjects([]));
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.description || '').toLowerCase().includes(q) || (r.voucherLabel || '').toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q);
  });

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['ID', 'Date', 'Project', 'Description', 'Voucher No', 'Debit', 'Credit', 'Balance', 'Note'];
    const lines = filtered.map((r, i) => [
      i + 1, new Date(r.date).toLocaleDateString('en-GB'), r.project, r.description, r.voucherLabel,
      r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2), r.note,
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receive-payment-statement-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">Accounts Module (Report) <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Receive Payment Statement</span>
          </div>
          <button onClick={() => navigate(-1)} className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back to Previous
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Chart Of Account*</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select value</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <div className="w-64">
            <label className="block text-sm text-gray-600 mb-1">Voucher Type</label>
            <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Invoice Type</option>
              {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={exceptContra} onChange={(e) => setExceptContra(e.target.checked)} />
            Except Contra
          </label>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={exportCsv} className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-md">Copy</button>
            <button onClick={exportCsv} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md">CSV</button>
            <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md">Excel</button>
            <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md">PDF</button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5" />
          </div>
        </div>

        {!accountId ? (
          <div className="text-center py-10 text-gray-400 border border-gray-200 rounded-md">
            Select a Chart Of Account to view its statement.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white text-left">
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">DATE</th>
                <th className="px-3 py-2 font-medium">PROJECT</th>
                <th className="px-3 py-2 font-medium">DESCRIPTION</th>
                <th className="px-3 py-2 font-medium">VOUCHER NO</th>
                <th className="px-3 py-2 font-medium text-right">DEBIT</th>
                <th className="px-3 py-2 font-medium text-right">CREDIT</th>
                <th className="px-3 py-2 font-medium text-right">BALANCE</th>
                <th className="px-3 py-2 font-medium">NOTE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">No entries found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                  <td className="px-3 py-2">{r.project}</td>
                  <td className="px-3 py-2 text-indigo-600">{r.description}</td>
                  <td className="px-3 py-2 text-indigo-600 font-medium">{r.voucherLabel}</td>
                  <td className="px-3 py-2 text-right">{r.debit || 0}</td>
                  <td className="px-3 py-2 text-right">{r.credit ? formatMoney(r.credit) : 0}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(r.balance)}</td>
                  <td className="px-3 py-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="font-semibold">
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="px-3 py-2 text-right">Opening Balance :</td>
                  <td></td>
                  <td className="px-3 py-2 text-right">{formatMoney(opening.debit)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(opening.credit)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(opening.balance)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">Current Total :</td>
                  <td></td>
                  <td className="px-3 py-2 text-right">{formatMoney(current.debit)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(current.credit)}</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">Closing :</td>
                  <td></td>
                  <td className="px-3 py-2 text-right">{formatMoney(closing.debit)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(closing.credit)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(closing.balance)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}