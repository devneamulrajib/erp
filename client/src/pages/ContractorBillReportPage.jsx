import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getParties } from '../api/party';
import { getContractorBillReport } from '../api/contractorBillReport';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Search, FileSpreadsheet, FileText } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function fmt(v) { return num(v).toLocaleString(undefined, { minimumFractionDigits: 2 }); }

export default function ContractorBillReportPage() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ gross: 0, securityDeposit: 0, paid: 0, due: 0 });
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContractorBillReport({ from, to, project: filterProject, party: filterParty });
      setRows(data.rows || []);
      setTotals(data.totals || { gross: 0, securityDeposit: 0, paid: 0, due: 0 });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterProject, filterParty]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    getParties().then(setParties).catch(() => {});
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.invoiceNo, r.contractor, r.labourWorker, r.particulars]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Billing', to: '/billing/contractor_bill_report' },
              { label: 'Contractor Bill Report' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Contractor Bill Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Labour and contractor billing across projects</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select value</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Contractor</label>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select One Option</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Gross</div>
            <div className="text-xl font-semibold text-slate-900">{fmt(totals.gross)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Security Deposit</div>
            <div className="text-xl font-semibold text-slate-900">{fmt(totals.securityDeposit)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Paid</div>
            <div className="text-xl font-semibold text-slate-900">{fmt(totals.paid)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due</div>
            <div className="text-xl font-semibold text-slate-900">{fmt(totals.due)}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
              >
                <FileText size={14} /> PDF
              </button>
              <span className="text-sm text-slate-500 ml-2">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-slate-500">entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search report..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Invoice No.', 'Contractor', 'Labour/Worker', 'Particulars', 'Qty/Days',
                    'Rate', 'Gross', 'Security Deposit', 'Paid', 'Due'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-16 text-slate-400 text-sm">No data available in table</td></tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.invoiceNo ? `${row.invoiceNo}-${i}` : i} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{row.invoiceNo}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.contractor || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.labourWorker || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.particulars || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.qtyDays).toLocaleString()} {row.unit}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmt(row.rate)}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{fmt(row.gross)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmt(row.securityDeposit)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmt(row.paid)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{fmt(row.due)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold bg-slate-50/50">
                    <td colSpan={7} className="px-4 py-3 text-right text-slate-600">GRAND TOTAL</td>
                    <td className="px-4 py-3 text-slate-900">{fmt(totals.gross)}</td>
                    <td className="px-4 py-3 text-slate-900">{fmt(totals.securityDeposit)}</td>
                    <td className="px-4 py-3 text-slate-900">{fmt(totals.paid)}</td>
                    <td className="px-4 py-3 text-slate-900">{fmt(totals.due)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
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