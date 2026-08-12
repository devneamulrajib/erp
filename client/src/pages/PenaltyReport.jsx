import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Share Project', to: '/project-module/share-project/penalty-report' },
          { label: 'Penalty Report' },
        ]}
      />

      <div className="px-4 pb-6">
        {/* Filters */}
        <div className="flex items-end gap-6 mb-5 flex-wrap">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Project</label>
            <div className="w-64">
              <SearchableSelect
                options={projectOptions}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Select a project"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Customer</label>
            <div className="w-64">
              <SearchableSelect
                options={customerOptions}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Select value"
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

        {/* Entries + Search row */}
        <div className="flex items-center justify-between mb-3">
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

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">SHAREHOLDER NAME</th>
                <th className="px-4 py-3 font-medium">LAST DATE</th>
                <th className="px-4 py-3 font-medium">SHARE AMOUNT</th>
                <th className="px-4 py-3 font-medium">PAY DATE</th>
                <th className="px-4 py-3 font-medium">CODE</th>
                <th className="px-4 py-3 font-medium">PAID AMOUNT</th>
                <th className="px-4 py-3 font-medium">DUE AMOUNT</th>
                <th className="px-4 py-3 font-medium">PENALTY DAYS</th>
                <th className="px-4 py-3 font-medium">PENALTY</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No data available in table
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{r.id}</td>
                    <td className="px-4 py-3">{r.shareholderName}</td>
                    <td className="px-4 py-3">{r.lastDate}</td>
                    <td className="px-4 py-3">{r.shareAmount}</td>
                    <td className="px-4 py-3">{r.payDate}</td>
                    <td className="px-4 py-3">{r.code}</td>
                    <td className="px-4 py-3">{r.paidAmount}</td>
                    <td className="px-4 py-3">{r.dueAmount}</td>
                    <td className="px-4 py-3">{r.penaltyDays}</td>
                    <td className="px-4 py-3">{r.penalty}</td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-gray-200 font-medium">
                <td colSpan={9} className="px-4 py-3 text-right">TOTAL</td>
                <td className="px-4 py-3">{totalPenalty}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
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