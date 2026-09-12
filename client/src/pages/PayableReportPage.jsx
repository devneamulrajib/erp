import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, FileSpreadsheet, Search, Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { getContactLedgerSummary } from '../api/accountingReports';
import { getParties } from '../api/party';
import { getProjects } from '../api/project';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function PayableReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ opening: 0, debit: 0, credit: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [contactId, setContactId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getContactLedgerSummary({
        contactType: 'Supplier',
        contactId: contactId || undefined,
        project: projectId || undefined,
        from,
        to,
      });
      setRows(data.rows || []);
      setTotals(data.totals || { opening: 0, debit: 0, credit: 0, balance: 0 });
    } catch (err) {
      console.error('Failed to load payable report', err);
      setError(err.message || 'Failed to load payable report');
      setRows([]);
      setTotals({ opening: 0, debit: 0, credit: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  }, [from, to, contactId, projectId]);

  useEffect(() => { load(); }, [load]);

  // Suppliers now come from Party (type: 'supplier' | 'contractor'), which
  // is what ContractorBill.partyId actually links to — ChartOfAccount was
  // the wrong source and always returned zero-activity accounts.
  // getParties() / getProjects() already resolve to the unwrapped response
  // body, not an axios { data } wrapper, so we read them directly.
  useEffect(() => {
    getParties()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.parties || [];
        setSuppliers(list.filter((p) => p.type === 'supplier' || p.type === 'contractor'));
      })
      .catch(() => setSuppliers([]));
    getProjects()
      .then((data) => setProjects(Array.isArray(data) ? data : data?.data || data?.projects || []))
      .catch(() => setProjects([]));
  }, []);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['SL', 'Supplier Name', 'Opening Balance', 'Debit', 'Credit', 'Balance'];
    const lines = rows.map((r, i) => [
      i + 1, r.name, (r.openingBalance || 0).toFixed(2), (r.debit || 0).toFixed(2), (r.credit || 0).toFixed(2), (r.balance || 0).toFixed(2),
    ]);
    lines.push(['', 'Total', totals.opening.toFixed(2), totals.debit.toFixed(2), totals.credit.toFixed(2), totals.balance.toFixed(2)]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payable-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module (Report)', to: '/accounts-module/reports' },
                { label: 'Payable Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Payable Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track what's owed to suppliers and contractors over a date range</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Previous
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <Users size={12} /> Suppliers
            </div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <TrendingDown size={12} /> Total Debit
            </div>
            <div className="text-xl font-semibold text-slate-900">{formatMoney(totals.debit)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <TrendingUp size={12} /> Total Credit
            </div>
            <div className="text-xl font-semibold text-slate-900">{formatMoney(totals.credit)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              <Wallet size={12} /> Total Payable
            </div>
            <div className="text-xl font-semibold text-indigo-600">{formatMoney(totals.balance)}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From Date</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To Date</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Contractor / Supplier</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Search size={14} className="text-slate-400" />
              <span>{loading ? 'Loading…' : `${rows.length} supplier${rows.length === 1 ? '' : 's'} in this period`}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-red-600/20 transition-colors"
              >
                <FileText size={14} />
                PDF
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Supplier Name', 'Opening Balance', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-medium text-xs uppercase tracking-wide ${i >= 2 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={28} strokeWidth={1.5} />
                        <p className="text-sm">No suppliers found for this date range and filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3.5 text-indigo-600 font-medium">{r.name}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{formatMoney(r.openingBalance)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{formatMoney(r.debit)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{formatMoney(r.credit)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{formatMoney(r.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-indigo-50/70 font-semibold border-t border-indigo-100">
                    <td colSpan={2} className="px-4 py-3.5 text-slate-700">Total</td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{formatMoney(totals.opening)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{formatMoney(totals.debit)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{formatMoney(totals.credit)}</td>
                    <td className="px-4 py-3.5 text-right text-indigo-700">{formatMoney(totals.balance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}