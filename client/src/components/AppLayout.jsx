// client/src/components/AppLayout.jsx
// Shared layout for every staff page: the collapsible left sidebar plus the
// page itself (each page still renders its own Topbar with the floating menu).
// Because this is a layout route, the sidebar stays mounted while you move
// between pages, so its open groups and collapsed/expanded state are kept.
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { PageLoader } from './PageLoader';

export default function AppLayout() {
  // Not logged in: the page's own guard redirects to /login, no sidebar.
  if (!localStorage.getItem('token')) return <Outlet />;

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
