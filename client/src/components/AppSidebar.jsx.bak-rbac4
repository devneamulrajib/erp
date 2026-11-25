// client/src/components/AppSidebar.jsx
// Collapsible left sidebar, in the ERP's own look (white panel, slate borders,
// black active item like the top menu). Shown ONLY to users with their own
// section list (not admins/superadmins, not role-based users). The three-dot
// button switches between the slim icon rail and the full menu; the choice is
// saved. It lists only the sections and pages this user may open
// (getSidebarNavForUser); the floating top menu is unchanged.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, EllipsisVertical } from 'lucide-react';
import companyLogo from '../assets/trikon-logo.png';
import { getSidebarNavForUser, shouldShowSidebar } from './navConfig';
import { USER_UPDATED_EVENT } from './SessionSync';

const COLLAPSED_KEY = 'erp.sidebar.collapsed';
const OPEN_KEY = 'erp.sidebar.open';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

// Starts open; the three-dot button's choice is remembered.
const initialCollapsed = () => localStorage.getItem(COLLAPSED_KEY) === '1';

function collectRoutes(items, out = []) {
  items.forEach((item) => {
    if (item.route) out.push(item.route);
    if (item.children?.length) collectRoutes(item.children, out);
  });
  return out;
}

// The menu route that best matches the current page: exact match first,
// otherwise the longest route that the path starts with (e.g. an edit page).
function bestRoute(routes, pathname) {
  if (routes.includes(pathname)) return pathname;
  let best = null;
  routes.forEach((r) => {
    if (r !== '/' && pathname.startsWith(`${r}/`) && (!best || r.length > best.length)) best = r;
  });
  return best;
}

const contains = (item, route) =>
  Boolean(route) && (item.route === route || Boolean(item.children?.some((c) => contains(c, route))));

function Leaf({ item, active, onGo }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onGo(item.route)}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
        active ? 'bg-black font-semibold text-white' : 'text-[#303030] hover:bg-[#f3f3f3]'
      }`}
    >
      {Icon && <Icon size={14} strokeWidth={1.8} className={active ? 'text-white' : 'text-slate-400'} />}
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function Group({ item, path, open, toggle, activeRoute, onGo }) {
  const key = `${path}${item.key}`;
  const isOpen = Boolean(open[key]);
  const inside = contains(item, activeRoute);
  const Icon = item.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[12.5px] font-semibold transition-colors hover:bg-[#f3f3f3] ${
          inside ? 'text-slate-900' : 'text-slate-600'
        }`}
      >
        {Icon && <Icon size={14} strokeWidth={1.8} className="text-slate-400" />}
        <span className="truncate">{item.label}</span>
        <ChevronRight size={13} className={`ml-auto shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
          <Items items={item.children} path={`${key}/`} open={open} toggle={toggle} activeRoute={activeRoute} onGo={onGo} />
        </div>
      )}
    </div>
  );
}

function Items({ items, path, open, toggle, activeRoute, onGo }) {
  return items.map((child) =>
    child.children?.length ? (
      <Group key={child.key} item={child} path={path} open={open} toggle={toggle} activeRoute={activeRoute} onGo={onGo} />
    ) : (
      <Leaf key={child.key} item={child} active={child.route === activeRoute} onGo={onGo} />
    )
  );
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [open, setOpen] = useState(() => readJson(OPEN_KEY, {}));

  useEffect(() => {
    const refresh = () => setUser(readUser());
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(USER_UPDATED_EVENT, refresh);
  }, []);

  const modules = useMemo(() => getSidebarNavForUser(user), [user]);
  const activeRoute = useMemo(() => bestRoute(collectRoutes(modules), pathname), [modules, pathname]);

  // Open every group on the way to the current page.
  useEffect(() => {
    if (!activeRoute) return;
    const keys = [];
    const walk = (items, path) =>
      items.forEach((item) => {
        if (!item.children?.length || !contains(item, activeRoute)) return;
        const key = `${path}${item.key}`;
        keys.push(key);
        walk(item.children, `${key}/`);
      });
    walk(modules, '');
    setOpen((prev) => (keys.every((k) => prev[k]) ? prev : { ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) }));
  }, [activeRoute, modules]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, JSON.stringify(open));
  }, [open]);

  const setCollapsedSaved = (value) => {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
    setCollapsed(value);
  };
  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const go = (route) => {
    if (route) navigate(route);
  };

  if (!shouldShowSidebar(user) || !modules.length) return null;

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-white transition-[width] duration-200 md:flex print:hidden ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
      aria-label="Sidebar"
    >
      {/* Header: logo + three-dot expand/collapse toggle */}
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200/70 ${collapsed ? 'flex-col justify-center gap-1 px-2' : 'gap-2.5 px-4'}`}>
        {!collapsed && (
          <button type="button" onClick={() => navigate('/')} className="flex min-w-0 items-center gap-2.5 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 p-1.5 shadow-xs ring-1 ring-slate-900/10">
              <img src={companyLogo} alt="Trikon" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-tight text-slate-900">TRIKON</span>
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">ERP</span>
              </span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">Menu</span>
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsedSaved(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[#f2f2f2] hover:text-slate-900 ${collapsed ? '' : 'ml-auto'}`}
        >
          <EllipsisVertical size={18} />
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto py-3 [scrollbar-width:thin] ${collapsed ? 'px-2' : 'px-3'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {modules.map((m) => {
              const Icon = m.icon;
              const inside = contains(m, activeRoute);
              return (
                <button
                  key={m.key}
                  type="button"
                  title={m.label}
                  aria-label={m.label}
                  onClick={() => {
                    if (m.children?.length) {
                      setOpen((prev) => ({ ...prev, [m.key]: true }));
                      setCollapsedSaved(false);
                    } else {
                      go(m.route);
                    }
                  }}
                  className={`flex size-11 items-center justify-center rounded-[14px] transition-colors ${
                    inside ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]' : 'text-[#202020] hover:bg-[#f2f2f2]'
                  }`}
                >
                  {Icon ? <Icon size={18} strokeWidth={1.8} /> : <span className="text-xs font-bold">{m.label.charAt(0)}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {modules.map((m) => {
              const Icon = m.icon;
              const inside = contains(m, activeRoute);
              const hasChildren = Boolean(m.children?.length);
              const isOpen = Boolean(open[m.key]);
              return (
                <div key={m.key}>
                  <button
                    type="button"
                    onClick={() => (hasChildren ? toggle(m.key) : go(m.route))}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    className={`flex h-10 w-full items-center gap-2.5 rounded-[14px] px-3 text-left text-[13px] font-semibold transition-colors ${
                      !hasChildren && m.route === activeRoute
                        ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
                        : inside
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-[#202020] hover:bg-[#f2f2f2]'
                    }`}
                  >
                    {Icon && <Icon size={16} strokeWidth={1.8} className="shrink-0" />}
                    <span className="truncate">{m.label}</span>
                    {hasChildren && (
                      <ChevronDown size={14} className={`ml-auto shrink-0 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {hasChildren && isOpen && (
                    <div className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                      <Items items={m.children} path={`${m.key}/`} open={open} toggle={toggle} activeRoute={activeRoute} onGo={go} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-slate-200/70 px-4 py-3">
          <p className="truncate text-xs font-semibold text-slate-800">{user?.name || 'ERP User'}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{user?.role || 'user'}</p>
        </div>
      )}
    </aside>
  );
}
