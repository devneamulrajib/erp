import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Copy, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getReceivePaymentStatement } from '../api/accountingReports';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getProjects } from '../api/project';

const VOUCHER_TYPES = ['Journal', 'Payment', 'Receipt', 'Contra', 'Expense', 'Purchase', 'Sales'];

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

// Some api/*.js files in this project return the raw axios response
// (payload on `.data`), others already unwrap it and resolve straight to
// the payload. This normalizes either shape into a plain array/object so
// the rest of the component never has to guess — and never calls `.map`
// on something that turned out to be undefined or a non-array object.
function unwrap(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray(result.data)) return result.data;
  if (result && typeof result === 'object' && result.data && typeof result.data === 'object') return result.data;
  return result;
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

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
      const result = await getReceivePaymentStatement({
        account: accountId, from, to,
        project: projectId || undefined,
        voucherType: voucherType || undefined,
        exceptContra: exceptContra || undefined,
      });
      const payload = unwrap(result);

      setRows(asArray(payload?.rows));
      setOpening(payload?.opening || { debit: 0, credit: 0, balance: 0 });
      setCurrent(payload?.current || { debit: 0, credit: 0 });
      setClosing(payload?.closing || { debit: 0, credit: 0, balance: 0 });
    } catch (err) {
      console.error('Failed to load receive payment statement', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to, projectId, voucherType, exceptContra]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getChartOfAccounts()
      .then((res) => setAccounts(asArray(unwrap(res))))
      .catch(() => setAccounts([]));
    getProjects()
      .then((res) => setProjects(asArray(unwrap(res))))
      .catch(() => setProjects([]));
  }, []);

  const filtered = asArray(rows).filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.description || '').toLowerCase().includes(q) || (r.voucherLabel || '').toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q);
  });

  function formatMoney(n) {
    return (Number(n) || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['ID', 'Date', 'Project', 'Description', 'Voucher No', 'Debit', 'Credit', 'Balance', 'Note'];
    const lines = filtered.map((r, i) => [
      i + 1, r.date ? new Date(r.date).toLocaleDateString('en-GB') : '', r.project, r.description, r.voucherLabel,
      formatMoney(r.debit), formatMoney(r.credit), formatMoney(r.balance), r.note,
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receive-payment-statement-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = "border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition w-full";

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module (Report)', to: '/accounts-module' },
                { label: 'Receive Payment Statement' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Receive Payment Statement</h1>
            <p className="text-sm text-slate-500 mt-0.5">View debits, credits and running balance for a chart of account</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Previous
          </button>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Date</label>
              <div className="flex gap-1">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Chart Of Account<span className="text-red-500 ml-0.5">*</span></label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                <option value="">Select value</option>
                {accounts.map((a) => <option key={a.id ?? a._id} value={a.id ?? a._id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="w-64">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Voucher Type</label>
              <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className={inputCls}>
                <option value="">Invoice Type</option>
                {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 pb-2.5">
              <input type="checkbox" checked={exceptContra} onChange={(e) => setExceptContra(e.target.checked)} className="accent-indigo-600" />
              Except Contra
            </label>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex gap-2">
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <Copy size={14} /> Copy
              </button>
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <FileDown size={14} /> CSV
              </button>
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <FileText size={14} /> PDF
              </button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {!accountId ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Select a Chart Of Account above to view its statement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Voucher No</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Debit</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Credit</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">No entries found</td></tr>
                  ) : filtered.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{r.project}</td>
                      <td className="px-4 py-3.5 text-indigo-600">{r.description}</td>
                      <td className="px-4 py-3.5 text-indigo-600 font-medium">{r.voucherLabel}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{r.debit ? formatMoney(r.debit) : 0}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{r.credit ? formatMoney(r.credit) : 0}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-900">{formatMoney(r.balance)}</td>
                      <td className="px-4 py-3.5 text-slate-500">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="font-semibold">
                    <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-slate-600">Opening Balance :</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(opening.debit)}</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(opening.credit)}</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(opening.balance)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-slate-600">Current Total :</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(current.debit)}</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(current.credit)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-slate-600">Closing :</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(closing.debit)}</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(closing.credit)}</td>
                      <td className="px-4 py-2.5 text-right">{formatMoney(closing.balance)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}