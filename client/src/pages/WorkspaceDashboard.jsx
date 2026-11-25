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
import { Sparkles } from 'lucide-react';
import Topbar from '../components/Topbar';
import { SECTION_WIDGETS } from '../components/workspace/ModuleWidgets';
import { DashboardHero, Skeleton } from '../components/dashboard/DashboardKit';
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

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHero
          tone="emerald"
          icon={Sparkles}
          eyebrow="My Workspace"
          title={`${greeting()}, ${firstName}`}
          subtitle={
            (hasExplicitModules(user) ? 'Your sections: ' : 'Sections your role can open: ') +
            (sections.length ? sections.map((k) => MODULE_LABELS[k]).join(' · ') : 'none yet — ask an admin for access')
          }
          actions={
            bigTabs.length > 1 ? (
              <div className="inline-flex rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-sm" role="tablist">
                {bigTabs.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === k}
                    onClick={() => selectTab(k)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                      activeTab === k ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {MODULE_LABELS[k]}
                  </button>
                ))}
              </div>
            ) : null
          }
        />

        {activeTab && (
          <Suspense fallback={<SectionFallback />}>
            {activeTab === 'accounts' ? <AccountingWorkspace /> : <HrmWorkspace />}
          </Suspense>
        )}

        {widgets.length > 0 && (
          <section className="space-y-3">
            {activeTab && <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Your other sections</h2>}
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
