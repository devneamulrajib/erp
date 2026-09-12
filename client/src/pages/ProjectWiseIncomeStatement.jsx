import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { getProjectWiseIncomeStatement } from '../api/reports';
import { Search, FileSpreadsheet, FileText, LayoutGrid, Wallet } from 'lucide-react';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProjectWiseIncomeStatement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

const [selectedCompany, setSelectedCompany] = useState('Trikon Holdings');
  const [selectedProject, setSelectedProject] = useState('');
  const [companyOptions, setCompanyOptions] = useState([{ value: 'Trikon Holdings', label: 'Trikon Holdings' }]);
  const [projectOptions, setProjectOptions] = useState([]);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getProjectWiseIncomeStatement({ company: selectedCompany, project: selectedProject });
        if (!cancelled) {
          setRows(data);
          setProjectOptions(data.map((p) => ({ value: p.id, label: p.project })));
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedCompany, selectedProject]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, pageSize]);

  const totals = useMemo(() => {
    const sum = (key) => filteredRows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return {
      sales: sum('sales'),
      totalIncome: sum('totalIncome'),
      totalExpense: sum('totalExpense'),
      available: sum('available'),
      profit: sum('profit'),
      billSubmission: sum('billSubmission'),
      receiveAmount: sum('receiveAmount'),
      due: sum('due'),
    };
  }, [filteredRows]);

  function handleExportExcel() {
    console.log('Export Excel', { selectedCompany, selectedProject });
  }
  function handleExportPdf() {
    console.log('Export PDF', { selectedCompany, selectedProject });
  }

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
                { label: 'Report', to: '/project-module/reports/project-wise-income' },
                { label: 'Project wise Income Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Project wise Income Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Income, expense and profit breakdown across projects</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <FileSpreadsheet size={16} strokeWidth={2.5} />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-rose-500/20 transition-colors"
            >
              <FileText size={16} strokeWidth={2.5} />
              PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Company</label>
              <div className="w-64">
                <SearchableSelect
                  options={companyOptions}
                  value={selectedCompany}
                  onChange={setSelectedCompany}
                  placeholder="Select value"
                  clearable
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project*</label>
              <div className="w-64">
                <SearchableSelect
                  options={projectOptions}
                  value={selectedProject}
                  onChange={setSelectedProject}
                  placeholder="Select Project"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Projects</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Income</div>
            <div className="text-xl font-semibold text-slate-900">{fmt(totals.totalIncome)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Profit</div>
            <div className="text-xl font-semibold text-emerald-600">{fmt(totals.profit)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due</div>
            <div className="text-xl font-semibold text-rose-600">{fmt(totals.due)}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Sales/Contract</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Budget</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Total Income</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Total Expense</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Available</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Profit</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Bill Submission</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Receive Amount</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-16 text-slate-400">Loading...</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No data available in table</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {pagedRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{r.id}</td>
                        <td className="px-5 py-3.5">
                          <Link to={`/project-module/projects/${r.id}`} className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2">
                            {r.project}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{r.sales}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{r.budget}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(r.totalIncome)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(r.totalExpense)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(r.available)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{fmt(r.profit)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{r.billSubmission}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-700">{r.receiveAmount}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-rose-600">{r.due}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold whitespace-nowrap">
                      <td colSpan={2} className="px-5 py-3.5 text-slate-700">Total</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{totals.sales}</td>
                      <td className="px-5 py-3.5"></td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(totals.totalIncome)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(totals.totalExpense)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{fmt(totals.available)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{fmt(totals.profit)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{totals.billSubmission}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">{totals.receiveAmount}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-rose-600">{totals.due}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredRows.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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