import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ProjectSubNav from '../components/ProjectSubNav';
import StatCard from '../components/StatCard';
import ProjectCard from '../components/ProjectCard';
import ProjectStatusDonut from '../components/ProjectStatusDonut';
import WorkingFinancialChart from '../components/WorkingFinancialChart';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import CommentsTable from '../components/CommentsTable';

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
        setProjects(projectsRes.data);
        setProgressChart(progressRes.data);
        setVouchers(vouchersRes.data);
        setComments(commentsRes.data);
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
      <div className="min-h-screen w-full bg-gray-50 text-left">
        <Topbar />
        <ProjectSubNav />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            <p className="font-semibold mb-1">Failed to load dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ProjectSubNav />

      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <StatCard label="Total Project" value={summary.totalProject} colorFrom="#78350f" colorTo="#374151" />
          <StatCard label="Running Project" value={summary.runningProject} colorFrom="#0ea5e9" colorTo="#0369a1" />
          <StatCard label="Material Req." value={summary.materialReq} colorFrom="#065f46" colorTo="#134e4a" />
          <StatCard label="Service Req." value={summary.serviceReq} colorFrom="#be185d" colorTo="#9d174d" />
          <StatCard label="Task" value={summary.task} colorFrom="#f97316" colorTo="#dc2626" />
          <StatCard label="Unsold Flat/Land" value={summary.unsoldFlatLand} colorFrom="#0ea5e9" colorTo="#0369a1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
          <div className="max-h-[520px] overflow-y-auto pr-1">
            {projects.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No projects yet</div>}
            {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
          </div>

          <div className="space-y-4">
            <ProjectStatusDonut data={statusSummary} />
            <WorkingFinancialChart data={progressChart} />
          </div>

          <PendingVoucherPanel vouchers={vouchers} />
        </div>

        <CommentsTable comments={comments} />
      </div>
    </div>
  );
}