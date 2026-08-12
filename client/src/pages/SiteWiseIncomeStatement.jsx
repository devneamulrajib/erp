import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { getSiteWiseIncomeStatement } from '../api/reports';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SiteWiseIncomeStatement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState('');
  const [projectOptions, setProjectOptions] = useState([]);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getSiteWiseIncomeStatement({ project: selectedProject });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedProject]);

  useEffect(() => {
    // TODO: replace with a real /projects list call once available app-wide
    setProjectOptions([]);
  }, []);

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
      profit: sum('profit'),
      billSubmission: sum('billSubmission'),
      receiveAmount: sum('receiveAmount'),
      due: sum('due'),
    };
  }, [filteredRows]);

  function handleExportPdf() {
    console.log('Export PDF', { selectedProject });
  }
  function handleExportExcel() {
    console.log('Export Excel', { selectedProject });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Report', to: '/project-module/reports/site-wise-income' },
          { label: 'Site wise Income Report' },
        ]}
      />

      <div className="px-4 pb-6">
        <div className="flex items-end gap-4 mb-5 flex-wrap">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project *</label>
            <div className="w-64">
              <SearchableSelect
                options={projectOptions}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Select Project"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Excel
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Search:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">SITE NAME</th>
                <th className="px-4 py-3 font-medium">PROJECT</th>
                <th className="px-4 py-3 font-medium text-right">SALES/CONTRACT</th>
                <th className="px-4 py-3 font-medium text-right">TOTAL INCOME</th>
                <th className="px-4 py-3 font-medium text-right">TOTAL EXPENSE</th>
                <th className="px-4 py-3 font-medium text-right">PROFIT</th>
                <th className="px-4 py-3 font-medium text-right">BILL SUBMISSION</th>
                <th className="px-4 py-3 font-medium text-right">RECEIVE AMOUNT</th>
                <th className="px-4 py-3 font-medium text-right">DUE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No data available in table</td></tr>
              ) : (
                <>
                  {pagedRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">{r.id}</td>
                      <td className="px-4 py-3">{r.siteName}</td>
                      <td className="px-4 py-3">{r.project}</td>
                      <td className="px-4 py-3 text-right">{r.sales}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.totalIncome)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.totalExpense)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.profit)}</td>
                      <td className="px-4 py-3 text-right">{r.billSubmission}</td>
                      <td className="px-4 py-3 text-right">{r.receiveAmount}</td>
                      <td className="px-4 py-3 text-right">{r.due}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <td colSpan={3} className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">{totals.sales}</td>
                    <td className="px-4 py-3 text-right">{fmt(totals.totalIncome)}</td>
                    <td className="px-4 py-3 text-right">{fmt(totals.totalExpense)}</td>
                    <td className="px-4 py-3 text-right">{fmt(totals.profit)}</td>
                    <td className="px-4 py-3 text-right">{totals.billSubmission}</td>
                    <td className="px-4 py-3 text-right">{totals.receiveAmount}</td>
                    <td className="px-4 py-3 text-right">{totals.due}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button type="button" className="px-3 py-1.5 rounded-md border border-indigo-500 bg-indigo-500 text-white">
              {currentPage}
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}