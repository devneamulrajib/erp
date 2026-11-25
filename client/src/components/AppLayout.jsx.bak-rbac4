// client/src/components/AppLayout.jsx
// Shared layout route for staff pages. Users with their own section list
// (Settings > Team Members > "Only selected sections") get the collapsible
// left sidebar next to the page; admins, superadmins and users on role-based
// access (no section list) get the page alone, exactly as before.
// Because this is a layout route, the sidebar stays mounted while you move
// between pages, so its open groups and collapsed/expanded state are kept.
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

  // No sidebar (not logged in, admin, or role-based user): page only.
  if (!localStorage.getItem('token') || !shouldShowSidebar(user)) return <Outlet />;

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
