// client/src/components/SessionSync.jsx
// Keeps the stored staff user (role, extra roles, section list) in step with
// the server, so menu and page access follow changes made in Team Members
// without asking people to log out and in again. Renders nothing.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { canOpenPath, homePathFor } from '../config/permissions';

const REFRESH_MS = 60 * 1000;
export const USER_UPDATED_EVENT = 'erp-user-updated';

const sameJson = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export default function SessionSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastRun = useRef(0);

  useEffect(() => {
    const isStaffPage = !location.pathname.startsWith('/portal') && location.pathname !== '/login';
    if (!isStaffPage || !localStorage.getItem('token')) return;
    // Sessions saved by an older build have no section list yet: refresh now.
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('user') || 'null'); } catch { saved = null; }
    const stale = !saved || !('modules' in saved) || !('roles' in saved);
    if (!stale && Date.now() - lastRun.current < REFRESH_MS) return;
    lastRun.current = Date.now();

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!data?.id) return;
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem('user') || 'null'); } catch { stored = null; }
        const next = { roles: [], modules: null, ...(stored || {}), ...data };
        const changed =
          !stored ||
          !('modules' in stored) ||
          !('roles' in stored) ||
          stored.role !== next.role ||
          stored.name !== next.name ||
          !sameJson(stored.roles, next.roles) ||
          !sameJson(stored.modules, next.modules);
        if (!changed) return;
        localStorage.setItem('user', JSON.stringify(next));
        window.dispatchEvent(new Event(USER_UPDATED_EVENT));
        if (!canOpenPath(next, window.location.pathname)) {
          navigate(homePathFor(next), { replace: true });
        }
      })
      .catch(() => {}); // 401 is handled by the axios interceptor
  }, [location.pathname, navigate]);

  return null;
}
