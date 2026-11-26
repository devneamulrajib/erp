// client/src/components/workspace/ModuleWidgets.jsx
// One compact widget per ERP section for the personal workspace. A user with
// several sections sees each section's widget. Every widget loads its own
// data from an existing API that the section already uses, so it works with
// the server-side section checks.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  FileText,
  Grid3x3,
  LifeBuoy,
  ListChecks,
  Settings,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../api/axios';
import { formatTaka, formatCount } from '../dashboard/dashboardUtils';
import { Skeleton } from '../dashboard/DashboardKit';
import { card, TONES, listOf, totalOf } from './workspaceKit';

function useLoad(loader) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const run = useCallback(() => {
    setState({ loading: true, error: null, data: null });
    loader()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((e) => setState({ loading: false, error: e.response?.data?.message || e.message, data: null }));
  }, [loader]); // loaders are module-level functions, so this runs once
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, retry: run };
}

const settled = (p) => p.then((r) => r.data).catch(() => null);
const pendingCount = (list) => list.filter((x) => /pending|submitted|requested/i.test(String(x.status || ''))).length;

function Widget({ title, icon: Icon, tone = 'slate', state, stats, links }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <section className={`${card} flex flex-col p-5`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon className="size-5" />
        </span>
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {state.loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
          : state.error
          ? (
            <div className="col-span-2 rounded-xl bg-rose-50 px-3 py-3 text-xs text-rose-600">
              Could not load ({state.error}).{' '}
              <button type="button" onClick={state.retry} className="font-semibold underline">Retry</button>
            </div>
          )
          : stats(state.data).map((s) => (
            <Link
              key={s.label}
              to={s.to || links[0]?.to || '/workspace'}
              className="rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100"
            >
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="mt-0.5 truncate text-lg font-extrabold tabular-nums text-slate-900">{s.value}</p>
            </Link>
          ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 ring-1 ring-stone-200 transition hover:bg-stone-50 hover:text-slate-900 hover:ring-stone-300"
          >
            {l.label} <ArrowUpRight className="size-3" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---- per-section widgets ----
const loadInventory = () => api.get('/dashboard/inventory-summary').then((r) => r.data);
function InventoryWidget() {
  const state = useLoad(loadInventory);
  return (
    <Widget
      title="Inventory & Procurement"
      icon={ShoppingBag}
      tone="green"
      state={state}
      stats={(d) => [
        { label: 'Purchases', value: formatCount(d?.purchases) },
        { label: 'Sales', value: formatCount(d?.sales) },
        { label: 'Suppliers', value: formatCount(d?.suppliers) },
        { label: 'Customers', value: formatCount(d?.customers) },
      ]}
      links={[
        { label: 'Add Purchase', to: '/inventory-module/purchase' },
        { label: 'Purchase Orders', to: '/procurement-module/purchase-order-list' },
        { label: 'Stock Report', to: '/inventory-module/reports/stock' },
        { label: 'Products', to: '/inventory-module/products/item-entry' },
      ]}
    />
  );
}

const loadProject = () => api.get('/dashboard/project-summary').then((r) => r.data);
function ProjectWidget() {
  const state = useLoad(loadProject);
  return (
    <Widget
      title="Projects"
      icon={Building2}
      tone="blue"
      state={state}
      stats={(d) => [
        { label: 'Projects', value: formatCount(d?.totalProject) },
        { label: 'Running', value: formatCount(d?.runningProject) },
        { label: 'Unsold flat/land', value: formatCount(d?.unsoldFlatLand) },
        { label: 'Tasks', value: formatCount(d?.task) },
      ]}
      links={[
        { label: 'Projects', to: '/project-module/projects' },
        { label: 'Sites', to: '/project-module/site' },
        { label: 'Flat/Land Sale', to: '/inventory-module/flat-sale' },
        { label: 'Project Summary', to: '/project-module/reports/project-summary' },
      ]}
    />
  );
}

const loadRequisition = () =>
  Promise.all([settled(api.get('/material-requisitions')), settled(api.get('/service-requisitions')), settled(api.get('/fund-requisitions'))]).then(
    ([m, s, f]) => {
      if (m === null && s === null && f === null) throw new Error('requisition lists unavailable');
      return { m: listOf(m), s: listOf(s), f: listOf(f), mt: totalOf(m), st: totalOf(s), ft: totalOf(f) };
    },
  );
function RequisitionWidget() {
  const state = useLoad(loadRequisition);
  return (
    <Widget
      title="Requisition"
      icon={ClipboardList}
      tone="amber"
      state={state}
      stats={(d) => [
        { label: 'Material', value: formatCount(d.mt) },
        { label: 'Service / work', value: formatCount(d.st) },
        { label: 'Fund', value: formatCount(d.ft) },
        { label: 'Pending', value: formatCount(pendingCount([...d.m, ...d.s, ...d.f])) },
      ]}
      links={[
        { label: 'Material Requisition', to: '/requisition-module/material-requisition-list' },
        { label: 'Service/Work', to: '/requisition-module/service-work-requisition-list' },
        { label: 'Fund Requisition', to: '/requisition-module/fund-requisition' },
      ]}
    />
  );
}

const loadCrm = () => api.get('/leads').then((r) => r.data);
function CrmWidget() {
  const state = useLoad(loadCrm);
  return (
    <Widget
      title="CRM"
      icon={FileText}
      tone="cyan"
      state={state}
      stats={(d) => {
        const list = listOf(d);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return [
          { label: 'Leads', value: formatCount(totalOf(d)) },
          { label: 'New this month', value: formatCount(list.filter((l) => new Date(l.createdAt) >= monthStart).length) },
        ];
      }}
      links={[
        { label: 'Leads', to: '/crm-module/lead' },
        { label: 'Follow Up', to: '/crm-module/call-center/follow-up' },
        { label: 'Campaigns', to: '/crm-module/campaign' },
      ]}
    />
  );
}

const loadInvestors = () => api.get('/investor-management/dashboard-summary').then((r) => r.data);
function InvestorsWidget() {
  const state = useLoad(loadInvestors);
  return (
    <Widget
      title="Investors"
      icon={TrendingUp}
      tone="purple"
      state={state}
      stats={(d) => [
        { label: 'Invested', value: formatTaka(d?.kpis?.totalInvested) },
        { label: 'Profit generated', value: formatTaka(d?.kpis?.profitGenerated) },
        { label: 'Paid out', value: formatTaka(d?.kpis?.totalPaid) },
        { label: 'Investments', value: formatCount(d?.totalCount) },
      ]}
      links={[
        { label: 'Portfolio', to: '/investors/dashboard' },
        { label: 'Investors', to: '/investors' },
        { label: 'Investments', to: '/investments' },
      ]}
    />
  );
}

const loadTasks = () => api.get('/tasks/overview').then((r) => r.data);
function TasksWidget() {
  const state = useLoad(loadTasks);
  return (
    <Widget
      title="Tasks & Work Log"
      icon={ListChecks}
      tone="red"
      state={state}
      stats={(d) => [
        { label: 'Present', value: formatCount(d?.totals?.present) },
        { label: 'Working now', value: formatCount(d?.totals?.working) },
        { label: 'Open tasks', value: formatCount(d?.totals?.openTasks) },
        { label: 'Overdue', value: formatCount(d?.totals?.overdue) },
      ]}
      links={[
        { label: 'Live Overview', to: '/hrm-module/tasks/overview' },
        { label: 'All Tasks', to: '/hrm-module/tasks' },
        { label: 'Work Log', to: '/hrm-module/work-log' },
      ]}
    />
  );
}

const loadSupport = () => api.get('/support-tickets/summary').then((r) => r.data);
function SupportWidget() {
  const state = useLoad(loadSupport);
  return (
    <Widget
      title="Support Desk"
      icon={LifeBuoy}
      tone="slate"
      state={state}
      stats={(d) => [
        { label: 'Open', value: formatCount(d?.open) },
        { label: 'Unassigned', value: formatCount(d?.unassigned) },
        { label: 'Critical/high', value: formatCount(d?.criticalHigh) },
        { label: 'Overdue', value: formatCount(d?.overdue) },
      ]}
      links={[{ label: 'Tickets', to: '/support-tickets' }]}
    />
  );
}

const loadSettings = () => api.get('/users').then((r) => r.data);
function SettingsWidget() {
  const state = useLoad(loadSettings);
  return (
    <Widget
      title="Team & Access"
      icon={Settings}
      tone="slate"
      state={state}
      stats={(d) => {
        const list = listOf(d);
        return [
          { label: 'Members', value: formatCount(list.length) },
          { label: 'Active', value: formatCount(list.filter((u) => u.isActive).length) },
          { label: 'Custom access', value: formatCount(list.filter((u) => Array.isArray(u.modules) && u.modules.length).length) },
          { label: 'Admins', value: formatCount(list.filter((u) => ['admin', 'superadmin'].includes(u.role)).length) },
        ];
      }}
      links={[{ label: 'Team Members', to: '/settings/users' }]}
    />
  );
}

function DashboardsWidget() {
  return (
    <section className={`${card} flex flex-col p-5`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-11 items-center justify-center rounded-full ${TONES.slate.icon}`}>
          <Grid3x3 className="size-5" />
        </span>
        <h3 className="text-[15px] font-bold text-slate-900">Company Dashboards</h3>
      </div>
      <p className="mt-3 text-[13px] text-slate-500">Company-wide overviews across every module.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { label: 'All', to: '/dashboard' },
          { label: 'Accounts', to: '/dashboard/accounts' },
          { label: 'Project', to: '/dashboard/project' },
          { label: 'Inventory', to: '/dashboard/inventory' },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            {l.label} →
          </Link>
        ))}
      </div>
    </section>
  );
}

// Section key -> widget, in display order.
export const SECTION_WIDGETS = [
  ['dashboards', DashboardsWidget],
  ['project', ProjectWidget],
  ['inventory', InventoryWidget],
  ['requisition', RequisitionWidget],
  ['tasks', TasksWidget],
  ['crm', CrmWidget],
  ['investors', InvestorsWidget],
  ['support', SupportWidget],
  ['settings', SettingsWidget],
];
