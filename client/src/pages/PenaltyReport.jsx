import { useState, useMemo, useEffect } from 'react';
import { Search, LayoutGrid, FileText, FileSpreadsheet } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';

// TODO: replace with your real api client, e.g. import api from '../api/axios';

export default function PenaltyReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [projectOptions, setProjectOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // const { data } = await api.get('/project-module/penalty-report', {
        //   params: { project: selectedProject, customer: selectedCustomer },
        // });
        // if (!cancelled) setRows(data);
        if (!cancelled) setRows([]); // no data yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedProject, selectedCustomer]);

  useEffect(() => {
    // TODO: api.get('/project-module/projects').then(({ data }) =>
    //   setProjectOptions(data.map((p) => ({ value: p._id, label: p.name })))
    // );
    // TODO: api.get('/customers').then(({ data }) =>
    //   setCustomerOptions(data.map((c) => ({ value: c._id, label: c.name })))
    // );
    setProjectOptions([]);
    setCustomerOptions([]);
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) =>
      Object.values(r).join(' ').toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPenalty = useMemo(
    () => filteredRows.reduce((sum, r) => sum + (Number(r.penalty) || 0), 0),
    [filteredRows]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  function handleExportPdf() {
    // TODO: wire up PDF export
    console.log('Export PDF', { selectedProject, selectedCustomer });
  }

  function handleExportExcel() {
    // TODO: wire up Excel export
    console.log('Export Excel', { selectedProject, selectedCustomer });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Share Project', to: '/project-module/share-project/penalty-report' },
                { label: 'Penalty Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Penalty Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track overdue payments and accrued penalties</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-red-500/20 transition-colors"
            >
              <FileText size={16} />
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Records</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filteredRows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Penalty</div>
            <div className="text-xl font-semibold text-red-600">{totalPenalty.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Project</label>
              <SearchableSelect
                options={projectOptions}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Select a project"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer</label>
              <SearchableSelect
                options={customerOptions}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Select value"
              />
            </div>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search penalties..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Shareholder Name', 'Last Date', 'Share Amount', 'Pay Date', 'Code', 'Paid Amount', 'Due Amount', 'Penalty Days', 'Penalty'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No data available in table.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {pagedRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{r.id}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{r.shareholderName}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.lastDate}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.shareAmount}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.payDate}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.code}</td>
                        <td className="px-4 py-3.5 text-emerald-600 font-medium">{r.paidAmount}</td>
                        <td className="px-4 py-3.5 text-red-500 font-medium">{r.dueAmount}</td>
                        <td className="px-4 py-3.5 text-slate-600">{r.penaltyDays}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{r.penalty}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/50 font-medium">
                      <td colSpan={9} className="px-4 py-3.5 text-right text-slate-500 text-xs uppercase tracking-wide">Total</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{totalPenalty.toLocaleString()}</td>
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