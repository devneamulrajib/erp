import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { getAmountUsageReport } from '../api/reports';

export default function AmountUsageReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAmountUsageReport();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, pageSize]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Report', to: '/project-module/reports/amount-usage' },
          { label: 'Amount Usage Report' },
        ]}
      />

      <div className="px-4 pb-6">
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

        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">PROJECT</th>
                <th className="px-4 py-3 font-medium">EMPLOYEE NAME</th>
                <th className="px-4 py-3 font-medium text-right">GRAND TOTAL</th>
                <th className="px-4 py-3 font-medium text-right">USAGE</th>
                <th className="px-4 py-3 font-medium">ADDED BY</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data available in table</td></tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{r.id}</td>
                    <td className="px-4 py-3">{r.project}</td>
                    <td className="px-4 py-3">{r.employeeName || '-'}</td>
                    <td className="px-4 py-3 text-right">{r.grandTotal}</td>
                    <td className="px-4 py-3 text-right">{r.usage}</td>
                    <td className="px-4 py-3">{r.addedBy || '-'}</td>
                  </tr>
                ))
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1.5 rounded-md border ${
                  p === currentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
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