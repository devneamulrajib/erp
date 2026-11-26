// client/src/pages/WorkspaceDashboard.jsx
// Personal, section-based workspace ("My Workspace", /workspace).
// - Users with an explicit section list (Settings > Team Members) land here.
// - Accounting holders get the demo-style Deposit & Withdrawal workspace,
//   HRM holders the People & Payroll workspace; every other section adds its
//   own widget, so multi-section users see each section's widgets.
// - Everyone else can open it from Dashboards > My Workspace; they see the
//   sections their roles allow.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { SECTION_WIDGETS } from '../components/workspace/ModuleWidgets';
import { eyebrowClass } from '../components/workspace/workspaceKit';
import { Skeleton } from '../components/dashboard/DashboardKit';
import { greeting, currentStaffUser } from '../components/dashboard/dashboardUtils';
import { USER_UPDATED_EVENT } from '../components/SessionSync';
import { ACCESS_MODULES, MODULE_LABELS, canAccessModule, hasExplicitModules } from '../config/permissions';

const AccountingWorkspace = lazy(() => import('../components/workspace/AccountingWorkspace'));
const HrmWorkspace = lazy(() => import('../components/workspace/HrmWorkspace'));

function SectionFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function WorkspaceDashboard() {
  const [user, setUser] = useState(currentStaffUser);

  useEffect(() => {
    const refresh = () => setUser(currentStaffUser());
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(USER_UPDATED_EVENT, refresh);
  }, []);

  const sections = useMemo(() => ACCESS_MODULES.map((m) => m.key).filter((k) => canAccessModule(user, k)), [user]);
  const has = (k) => sections.includes(k);
  // Tasks widget also shows for HRM holders (Tasks & Work Log lives in HRM).
  const widgets = SECTION_WIDGETS.filter(([key]) => has(key) || (key === 'tasks' && has('hrm')));
  // Selected tab lives in the URL (?tab=hrm), so Back and shared links keep it.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const bigTabs = ['accounts', 'hrm'].filter(has);
  const activeTab = bigTabs.includes(tab) ? tab : bigTabs[0];
  const selectTab = (k) => {
    const next = new URLSearchParams(params);
    next.set('tab', k);
    setParams(next, { replace: true });
  };
  const firstName = (user?.name || 'there').split(' ')[0];
  // The open workspace puts its filters / "New transaction" in the header.
  const [actionsEl, setActionsEl] = useState(null);
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen w-full bg-cream text-left">
      <Topbar />

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className={eyebrowClass}>
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              {activeTab ? `${MODULE_LABELS[activeTab]} workspace` : 'My workspace'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {todayLabel} &middot;{' '}
              {(hasExplicitModules(user) ? 'Your sections: ' : 'Sections your role can open: ') +
                (sections.length ? sections.map((k) => MODULE_LABELS[k]).join(' \u00b7 ') : 'none yet \u2014 ask an admin for access')}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            {bigTabs.length > 1 && (
              <div className="inline-flex self-start rounded-full bg-stone-200/70 p-1 sm:self-auto" role="tablist">
                {bigTabs.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === k}
                    onClick={() => selectTab(k)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      activeTab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {MODULE_LABELS[k]}
                  </button>
                ))}
              </div>
            )}
            <div ref={setActionsEl} className="contents" />
          </div>
        </header>

        {activeTab && (
          <Suspense fallback={<SectionFallback />}>
            {activeTab === 'accounts' ? <AccountingWorkspace actionsEl={actionsEl} /> : <HrmWorkspace />}
          </Suspense>
        )}

        {widgets.length > 0 && (
          <section className="space-y-3">
            {activeTab && <h2 className={eyebrowClass}>Your other sections</h2>}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {widgets.map(([key, W]) => (
                <W key={key} />
              ))}
            </div>
          </section>
        )}

        {!activeTab && widgets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-base font-bold text-slate-800">No sections assigned yet</p>
            <p className="mt-1 text-sm text-slate-500">
              An admin can grant sections in <Link to="/settings/users" className="font-semibold underline">Settings → Team Members</Link>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
