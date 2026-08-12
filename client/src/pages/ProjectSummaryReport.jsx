import { useState, useMemo, useEffect } from 'react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { getProjectSummaryReport } from '../api/reports';

const GROUPS = ['materials', 'services', 'expenses'];
const GROUP_LABELS = { materials: 'Materials', services: 'Services', expenses: 'Expenses' };

export default function ProjectSummaryReport() {
  const [data, setData] = useState({ materials: [], services: [], expenses: [] });
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState('1 July, 2026 - 31 July, 2026');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [category, setCategory] = useState('');

  const [companyOptions, setCompanyOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getProjectSummaryReport({
          dateRange,
          company: selectedCompany,
          project: selectedProject,
          site: selectedSite,
          task: selectedTask,
          category,
        });
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData({ materials: [], services: [], expenses: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateRange, selectedCompany, selectedProject, selectedSite, selectedTask, category]);

  useEffect(() => {
    // TODO: hook these up once /options-style endpoints exist for company/site/task
    setCompanyOptions([]);
    setProjectOptions([]);
    setSiteOptions([]);
    setTaskOptions([]);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.trim().toLowerCase();
    const filterRows = (rows = []) =>
      rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(term));
    return {
      materials: filterRows(data.materials),
      services: filterRows(data.services),
      expenses: filterRows(data.expenses),
    };
  }, [data, searchTerm]);

  const groupTotal = (rows = []) =>
    rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const groupQty = (rows = []) =>
    rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const grandTotalQty = GROUPS.reduce((sum, g) => sum + groupQty(filteredGroups[g]), 0);
  const grandTotalAmount = GROUPS.reduce((sum, g) => sum + groupTotal(filteredGroups[g]), 0);

  const totalEntries = GROUPS.reduce((sum, g) => sum + (filteredGroups[g]?.length || 0), 0);

  function handleExportExcel() {
    // TODO: wire up Excel export
    console.log('Export Excel', { dateRange, selectedCompany, selectedProject, selectedSite, selectedTask, category });
  }

  function handleExportPdf() {
    // TODO: wire up PDF export
    console.log('Export PDF', { dateRange, selectedCompany, selectedProject, selectedSite, selectedTask, category });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Project', to: '/project-module/reports/project-summary' },
          { label: 'Project Summary Report' },
        ]}
      />

      <div className="px-4 pb-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <input
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Company</label>
            <SearchableSelect
              options={companyOptions}
              value={selectedCompany}
              onChange={setSelectedCompany}
              placeholder="Select value"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Project</label>
            <SearchableSelect
              options={projectOptions}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="Select Project"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Site</label>
            <SearchableSelect
              options={siteOptions}
              value={selectedSite}
              onChange={setSelectedSite}
              placeholder="Select Site"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Task</label>
            <SearchableSelect
              options={taskOptions}
              value={selectedTask}
              onChange={setSelectedTask}
              placeholder="Select Task"
            />
          </div>
        </div>

        <div className="mb-5 max-w-xs">
          <label className="block text-sm text-gray-600 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Search Service/Work"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Export + entries + search row */}
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

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-4 py-3 font-medium">SL NO</th>
                <th className="px-4 py-3 font-medium">DESCRIPTION</th>
                <th className="px-4 py-3 font-medium text-right">QUANTITY</th>
                <th className="px-4 py-3 font-medium text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : (
                <>
                  {GROUPS.map((group) => {
                    const rows = filteredGroups[group] || [];
                    return (
                      <>
                        <tr key={`${group}-header`} className="bg-gray-100">
                          <td colSpan={4} className="px-4 py-2 font-semibold text-gray-700">
                            {GROUP_LABELS[group]}
                          </td>
                        </tr>
                        {rows.map((r, i) => (
                          <tr key={`${group}-${r.id ?? i}`} className="border-b border-gray-100 last:border-0">
                            <td className="px-4 py-3">{i + 1}</td>
                            <td className="px-4 py-3">{r.description}</td>
                            <td className="px-4 py-3 text-right">{r.quantity}</td>
                            <td className="px-4 py-3 text-right">{Number(r.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr key={`${group}-total`} className="bg-gray-50 font-medium">
                          <td colSpan={2} className="px-4 py-3 text-right">Total</td>
                          <td className="px-4 py-3 text-right">{groupQty(rows)}</td>
                          <td className="px-4 py-3 text-right">{groupTotal(rows).toFixed(2)}</td>
                        </tr>
                      </>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-200">
                    <td colSpan={2} className="px-4 py-3 text-right">Grand Total</td>
                    <td className="px-4 py-3 text-right">{grandTotalQty}</td>
                    <td className="px-4 py-3 text-right">{grandTotalAmount.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>Showing 1 to {totalEntries} of {totalEntries} entries</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled className="px-3 py-1.5 rounded-md border border-gray-300 opacity-40">Previous</button>
            <button type="button" className="px-3 py-1.5 rounded-md border border-indigo-500 bg-indigo-500 text-white">1</button>
            <button type="button" disabled className="px-3 py-1.5 rounded-md border border-gray-300 opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}