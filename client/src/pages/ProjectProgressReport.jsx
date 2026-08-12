import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { getProjectProgressReport } from '../api/reports';

export default function ProjectProgressReport() {
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
        const data = await getProjectProgressReport({ project: selectedProject });
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
  }, [selectedProject]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, pageSize]);

  function handleExportExcel() {
    console.log('Export Excel', { selectedProject });
  }
  function handleExportPdf() {
    console.log('Export PDF', { selectedProject });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Project', to: '/project-module/reports/project-progress' },
          { label: 'Project Progress Report' },
        ]}
      />

      <div className="px-4 pb-6">
        <div className="mb-5 max-w-xs">
          <label className="block text-sm text-gray-600 mb-1">Project</label>
          <SearchableSelect
            options={projectOptions}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select Project"
          />
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              PDF
            </button>
            <span className="text-sm text-gray-600 ml-2">Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entries</span>
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
                <th className="px-4 py-3 font-medium">PROJECT TYPE</th>
                <th className="px-4 py-3 font-medium">PROJECT</th>
                <th className="px-4 py-3 font-medium text-right">TOTAL TASK</th>
                <th className="px-4 py-3 font-medium text-right">COMPLETE TASK</th>
                <th className="px-4 py-3 font-medium text-right">WORKING PROGRESS</th>
                <th className="px-4 py-3 font-medium text-right">BUDGET</th>
                <th className="px-4 py-3 font-medium text-right">COST</th>
                <th className="px-4 py-3 font-medium text-right">FINANCIAL PROGRESS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No data available in table</td></tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{r.id}</td>
                    <td className="px-4 py-3">{r.projectType}</td>
                    <td className="px-4 py-3">
                      <Link to={`/project-module/projects/${r.id}`} className="text-indigo-600 hover:underline">
                        {r.project}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{r.totalTask}</td>
                    <td className="px-4 py-3 text-right">{r.completeTask}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{r.workingProgress.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right">{r.budget}</td>
                    <td className="px-4 py-3 text-right">{r.cost}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{r.financialProgress.toFixed(2)}%</td>
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