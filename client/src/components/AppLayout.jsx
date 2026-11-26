// client/src/components/AppLayout.jsx
// Shared layout route for staff pages. Every staff user except admins and
// superadmins gets the collapsible left sidebar next to the page (it lists
// the sections they can open); admins and superadmins get the page alone,
// full width, exactly as before.
// Because this is a layout route, the sidebar stays mounted while you move
// between pages, so its open groups and collapsed/expanded state are kept.
// Mobile: sidebar becomes an overlay drawer (closed by default).
import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { shouldShowSidebar } from './navConfig';
import { PageLoader } from './PageLoader';
import { USER_UPDATED_EVENT } from './SessionSync';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function AppLayout() {
  const [user, setUser] = useState(readUser);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Access changes made in Team Members reach us through SessionSync.
  useEffect(() => {
    const refresh = () => setUser(readUser());
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Mobile sidebar open state (controlled from Topbar via custom event)
  useEffect(() => {
    const open = () => setMobileSidebarOpen(true);
    window.addEventListener('erp:open-sidebar', open);
    return () => window.removeEventListener('erp:open-sidebar', open);
  }, []);

  // No sidebar (not logged in, admin or superadmin): page only.
  if (!localStorage.getItem('token') || !shouldShowSidebar(user)) return <Outlet />;

  return (
    <div className="flex min-h-screen w-full overflow-x-clip">
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}