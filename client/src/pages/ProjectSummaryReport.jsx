import { useState, useMemo, useEffect, Fragment } from 'react';
import { Search, LayoutGrid, FileText, FileSpreadsheet } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import SearchableSelect from '../components/SearchableSelect';
import { getProjectSummaryReport } from '../api/reports';

const GROUPS = ['materials', 'services', 'expenses'];
const GROUP_LABELS = { materials: 'Materials', services: 'Services', expenses: 'Expenses' };

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

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
    console.log('Export Excel', { dateRange, selectedCompany, selectedProject, selectedSite, selectedTask, category });
  }

  function handleExportPdf() {
    console.log('Export PDF', { dateRange, selectedCompany, selectedProject, selectedSite, selectedTask, category });
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
                { label: 'Project', to: '/project-module/reports/project-summary' },
                { label: 'Project Summary Report' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Project Summary Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Materials, services, and expenses breakdown</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Line Items</div>
            <div className="text-xl font-semibold text-slate-900">{totalEntries}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Materials</div>
            <div className="text-xl font-semibold text-slate-900">{groupTotal(filteredGroups.materials).toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Services</div>
            <div className="text-xl font-semibold text-slate-900">{groupTotal(filteredGroups.services).toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Grand Total</div>
            <div className="text-xl font-semibold text-indigo-600">{grandTotalAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Date</label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Company</label>
              <SearchableSelect
                options={companyOptions}
                value={selectedCompany}
                onChange={setSelectedCompany}
                placeholder="Select value"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Project</label>
              <SearchableSelect
                options={projectOptions}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Select Project"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Site</label>
              <SearchableSelect
                options={siteOptions}
                value={selectedSite}
                onChange={setSelectedSite}
                placeholder="Select Site"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Task</label>
              <SearchableSelect
                options={taskOptions}
                value={selectedTask}
                onChange={setSelectedTask}
                placeholder="Select Task"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Search Service/Work"
              className={inputClass}
            />
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
                placeholder="Search line items..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">SL No</th>
                  <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-slate-400 text-sm">Loading…</td>
                  </tr>
                ) : totalEntries === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No data available in table.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {GROUPS.map((group) => {
                      const rows = filteredGroups[group] || [];
                      return (
                        <Fragment key={group}>
                          <tr className="bg-slate-50/70">
                            <td colSpan={4} className="px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                              {GROUP_LABELS[group]}
                            </td>
                          </tr>
                          {rows.map((r, i) => (
                            <tr key={`${group}-${r.id ?? i}`} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                              <td className="px-4 py-3 text-slate-600">{r.description}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{r.quantity}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{Number(r.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50/50 font-medium">
                            <td colSpan={2} className="px-4 py-2.5 text-right text-slate-500 text-xs uppercase tracking-wide">Total</td>
                            <td className="px-4 py-2.5 text-right text-slate-700">{groupQty(rows)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-900 font-semibold">{groupTotal(rows).toFixed(2)}</td>
                          </tr>
                        </Fragment>
                      );
                    })}
                    <tr className="bg-indigo-50/60 font-semibold border-t border-indigo-100">
                      <td colSpan={2} className="px-4 py-3.5 text-right text-slate-600 text-xs uppercase tracking-wide">Grand Total</td>
                      <td className="px-4 py-3.5 text-right text-slate-900">{grandTotalQty}</td>
                      <td className="px-4 py-3.5 text-right text-indigo-600">{grandTotalAmount.toFixed(2)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (static — grouped totals aren't paginated) */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">1</span> to{' '}
              <span className="font-medium text-slate-700">{totalEntries}</span> of{' '}
              <span className="font-medium text-slate-700">{totalEntries}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button type="button" disabled className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 opacity-40">
                Previous
              </button>
              <button type="button" className="w-9 h-9 rounded-lg text-sm font-medium bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                1
              </button>
              <button type="button" disabled className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}