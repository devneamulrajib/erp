import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import ProjectSubNav from '../components/ProjectSubNav';
import ProjectCard from '../components/ProjectCard';
import ProjectStatusDonut from '../components/ProjectStatusDonut';
import WorkingFinancialChart from '../components/WorkingFinancialChart';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import CommentsTable from '../components/CommentsTable';
import { FolderKanban, Activity, PackageSearch, Wrench, ListChecks, Home } from 'lucide-react';

const STAT_CARDS = [
  { key: 'totalProject', label: 'Total Project', icon: FolderKanban },
  { key: 'runningProject', label: 'Running Project', icon: Activity },
  { key: 'materialReq', label: 'Material Req.', icon: PackageSearch },
  { key: 'serviceReq', label: 'Service Req.', icon: Wrench },
  { key: 'task', label: 'Task', icon: ListChecks },
  { key: 'unsoldFlatLand', label: 'Unsold Flat/Land', icon: Home },
];

export default function ProjectDashboard() {
  const [summary, setSummary] = useState(null);
  const [statusSummary, setStatusSummary] = useState({ total: 0, onTrack: 0, atRisk: 0, inTrouble: 0 });
  const [projects, setProjects] = useState([]);
  const [progressChart, setProgressChart] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [
          summaryRes,
          statusRes,
          projectsRes,
          progressRes,
          vouchersRes,
          commentsRes,
        ] = await Promise.all([
          api.get('/dashboard/project-summary'),
          api.get('/dashboard/project-status-summary'),
          api.get('/dashboard/projects'),
          api.get('/dashboard/project-progress'),
          api.get('/dashboard/pending-vouchers'),
          api.get('/dashboard/comments'),
        ]);

        setSummary(summaryRes.data);
        setStatusSummary(statusRes.data);
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
        setProgressChart(Array.isArray(progressRes.data) ? progressRes.data : []);
        setVouchers(Array.isArray(vouchersRes.data) ? vouchersRes.data : []);
        setComments(Array.isArray(commentsRes.data) ? commentsRes.data : []);
      } catch (err) {
        console.error('Failed to load project dashboard:', err);
        setError(
          err.response
            ? `Server error ${err.response.status}: ${err.response.config?.url || 'unknown endpoint'}`
            : 'Could not reach the server. Is it running?'
        );
      }
    }

    loadAll();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-left">
        <Topbar />
        <ProjectSubNav />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3">
            <p className="font-semibold mb-1 text-sm">Failed to load dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-left">
        <Topbar />
        <ProjectSubNav />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16 text-center text-slate-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />
      <ProjectSubNav />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb items={[{ label: 'Home', to: '/dashboard' }, { label: 'Project Dashboard' }]} />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Project Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of all active projects, requisitions, and pending work</p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {STAT_CARDS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
                <Icon size={15} className="text-indigo-400" />
              </div>
              <div className="text-xl font-semibold text-slate-900 font-mono">{summary[key] ?? 0}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          {/* Projects list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
            </div>
            <div className="max-h-[460px] overflow-y-auto p-3 space-y-2">
              {projects.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-12">No projects yet</div>
              ) : (
                projects.map((p) => <ProjectCard key={p._id} project={p} />)
              )}
            </div>
          </div>

          {/* Status + financial chart */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Project Status Summary</h2>
              <p className="text-xs text-slate-400 mb-3">Current overview</p>
              <ProjectStatusDonut data={statusSummary} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Working &amp; Financial Progress</h2>
              <WorkingFinancialChart data={progressChart} />
            </div>
          </div>

          {/* Pending vouchers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Pending Voucher/Invoice</h2>
            </div>
            <div className="p-3">
              <PendingVoucherPanel vouchers={vouchers} />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">Recent Comments</h2>
          </div>
          <div className="p-3">
            <CommentsTable comments={comments} />
          </div>
        </div>
      </div>
    </div>
  );
}