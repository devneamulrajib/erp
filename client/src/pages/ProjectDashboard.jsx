import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import ProjectSubNav from '../components/ProjectSubNav';
import ProjectCard from '../components/ProjectCard';
import ProjectStatusDonut from '../components/ProjectStatusDonut';
import WorkingFinancialChart from '../components/WorkingFinancialChart';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import CommentsTable from '../components/CommentsTable';
import {
  DashboardHero, KpiCard, Panel, QuickLinks, Skeleton, EmptyState, ErrorState, heroButton,
} from '../components/dashboard/DashboardKit';
import { formatCount } from '../components/dashboard/dashboardUtils';
import {
  FolderKanban, Activity, PackageSearch, Wrench, ListChecks, Home, RefreshCw,
  PieChart, BarChart3, FileClock, MessageSquare, Plus, MapPin, FileBarChart, Share2,
} from 'lucide-react';

const STAT_CARDS = [
  { key: 'totalProject', label: 'Total Projects', icon: FolderKanban, accent: 'indigo', to: '/project-module/projects' },
  { key: 'runningProject', label: 'Running', icon: Activity, accent: 'emerald', to: '/project-module/projects' },
  { key: 'materialReq', label: 'Material Req.', icon: PackageSearch, accent: 'amber', to: '/requisition-module/material-requisition-list' },
  { key: 'serviceReq', label: 'Service Req.', icon: Wrench, accent: 'sky', to: '/requisition-module/service-work-requisition-list' },
  { key: 'task', label: 'Tasks', icon: ListChecks, accent: 'violet', to: '/hrm-module/tasks' },
  { key: 'unsoldFlatLand', label: 'Unsold Flat/Land', icon: Home, accent: 'rose', to: '/inventory-module/flat' },
];

const QUICK_LINKS = [
  { label: 'All Projects', to: '/project-module/projects', icon: FolderKanban, accent: 'indigo' },
  { label: 'Sites', to: '/project-module/site', icon: MapPin, accent: 'emerald' },
  { label: 'New Material Req.', to: '/requisition-module/material-requisition-add', icon: Plus, accent: 'amber' },
  { label: 'New Service Req.', to: '/requisition-module/service-work-requisition-add', icon: Wrench, accent: 'sky' },
  { label: 'Progress Report', to: '/project-module/reports/project-progress', icon: FileBarChart, accent: 'violet' },
  { label: 'Share Report', to: '/project-module/share-project/share-report', icon: Share2, accent: 'rose' },
];

// Each section loads on its own so one failing endpoint doesn't blank the page.
const SECTIONS = {
  summary: { url: '/dashboard/project-summary', empty: null },
  status: { url: '/dashboard/project-status-summary', empty: { total: 0, onTrack: 0, atRisk: 0, inTrouble: 0 } },
  projects: { url: '/dashboard/projects', empty: [], list: true },
  progress: { url: '/dashboard/project-progress', empty: [], list: true },
  vouchers: { url: '/dashboard/pending-vouchers', empty: [], list: true },
  comments: { url: '/dashboard/comments', empty: [], list: true },
};
const KEYS = Object.keys(SECTIONS);

function errorText(err) {
  if (err?.response) return err.response.data?.message || `Server error ${err.response.status}`;
  return 'Could not reach the server. Is it running?';
}

export default function ProjectDashboard() {
  const [data, setData] = useState(() => Object.fromEntries(KEYS.map((k) => [k, SECTIONS[k].empty])));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const results = await Promise.allSettled(KEYS.map((k) => api.get(SECTIONS[k].url)));
    const nextData = {};
    const nextErrors = {};
    results.forEach((r, i) => {
      const key = KEYS[i];
      const cfg = SECTIONS[key];
      if (r.status === 'fulfilled') {
        const value = r.value?.data;
        nextData[key] = cfg.list ? (Array.isArray(value) ? value : []) : (value ?? cfg.empty);
      } else {
        console.error(`Failed to load project dashboard section "${key}":`, r.reason);
        nextData[key] = cfg.empty;
        nextErrors[key] = errorText(r.reason);
      }
    });
    setData(nextData);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const { summary, status, projects, progress, vouchers, comments } = data;
  const allFailed = !loading && KEYS.every((k) => errors[k]);
  const completion = projects.length
    ? Math.round(projects.reduce((s, p) => s + (Number(p.percentComplete) || 0), 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />
      <ProjectSubNav />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Breadcrumb items={[{ label: 'Home', to: '/dashboard' }, { label: 'Project Dashboard' }]} />

        <DashboardHero
          tone="indigo"
          icon={FolderKanban}
          eyebrow="Project Module"
          title="Project Dashboard"
          subtitle="Overview of all projects, requisitions, approvals and on-site progress."
          stats={loading || !summary ? [] : [
            { label: 'Running', value: `${formatCount(summary.runningProject)} / ${formatCount(summary.totalProject)}` },
            { label: 'Avg. Completion', value: `${completion}%` },
            { label: 'Pending Vouchers', value: formatCount(vouchers.length) },
          ]}
          actions={
            <button onClick={() => loadAll(true)} disabled={refreshing} className={heroButton}>
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {allFailed ? (
          <Panel>
            <ErrorState title="Failed to load dashboard data" message={errors.summary} onRetry={() => loadAll(true)} />
          </Panel>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {STAT_CARDS.map(({ key, ...card }) => (
                <KpiCard
                  key={key}
                  {...card}
                  value={formatCount(summary?.[key])}
                  loading={loading}
                  error={!!errors.summary}
                />
              ))}
            </div>

            <QuickLinks items={QUICK_LINKS} />

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <Panel
                icon={FolderKanban}
                accent="indigo"
                title="Projects"
                subtitle="Latest 10 projects"
                right={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{projects.length}</span>}
                bodyClassName="max-h-[480px] overflow-y-auto p-3 space-y-2"
              >
                {loading ? (
                  [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : errors.projects ? (
                  <ErrorState message={errors.projects} onRetry={() => loadAll(true)} />
                ) : projects.length === 0 ? (
                  <EmptyState icon={FolderKanban} title="No projects yet" description="Projects you create will show up here." />
                ) : (
                  projects.map((p) => <ProjectCard key={p._id} project={p} />)
                )}
              </Panel>

              <div className="space-y-4">
                <Panel icon={PieChart} accent="emerald" title="Project Status Summary" subtitle="Current overview">
                  {loading ? (
                    <div className="flex h-[200px] items-center justify-center"><Skeleton className="size-40 rounded-full" /></div>
                  ) : errors.status ? (
                    <ErrorState message={errors.status} onRetry={() => loadAll(true)} />
                  ) : (
                    <ProjectStatusDonut data={status} />
                  )}
                </Panel>
                <Panel icon={BarChart3} accent="violet" title="Working & Financial Progress" subtitle="Task completion by project">
                  {loading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : errors.progress ? (
                    <ErrorState message={errors.progress} onRetry={() => loadAll(true)} />
                  ) : progress.length === 0 ? (
                    <EmptyState icon={BarChart3} title="No progress data" description="Progress appears once projects have tasks." />
                  ) : (
                    <WorkingFinancialChart data={progress} />
                  )}
                </Panel>
              </div>

              <Panel
                icon={FileClock}
                accent="amber"
                title="Pending Voucher/Invoice"
                subtitle="Waiting for approval"
                right={<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">{vouchers.length}</span>}
                bodyClassName="p-3"
              >
                {loading ? (
                  <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : errors.vouchers ? (
                  <ErrorState message={errors.vouchers} onRetry={() => loadAll(true)} />
                ) : vouchers.length === 0 ? (
                  <EmptyState icon={FileClock} title="All caught up" description="No vouchers are waiting for approval." />
                ) : (
                  <PendingVoucherPanel vouchers={vouchers} />
                )}
              </Panel>
            </div>

            {/* Comments */}
            <Panel icon={MessageSquare} accent="sky" title="Recent Comments" bodyClassName="p-3">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : errors.comments ? (
                <ErrorState message={errors.comments} onRetry={() => loadAll(true)} />
              ) : comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments yet" />
              ) : (
                <CommentsTable comments={comments} />
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
