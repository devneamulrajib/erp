// client/src/components/AppSidebar.jsx
// Collapsible left sidebar in the light workspace theme: white panel, a small
// WORKSPACE label, one accordion row per ERP section the user can open
// (clicking it expands its pages below as an indented tree), forest-green
// active item with lime icon, and a grey user / company card at the bottom.
// (Navy version: AppSidebar.jsx.bak-ui2.) Shown to
// every staff user except admins and superadmins (role defaults or selected
// sections). The three-dot button switches between the slim icon rail and the
// full menu; the choice is saved. It lists only the sections and pages this
// user may open (getSidebarNavForUser); the floating top menu is unchanged.
// Mobile (<md): becomes an overlay drawer, closed by default.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, EllipsisVertical, X,
  LayoutGrid, FileBarChart2, Receipt, Landmark, ShieldCheck, Settings, Users, FileText,
  Boxes, Wallet, Building2, ShoppingBag, ListChecks, ClipboardList, Waypoints, CircleDot,
} from 'lucide-react';
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

// Menu items without their own icon get one from their name, so every row
// has an icon like the reference design. Configured icons always win.
const ICON_RULES = [
  [/dashboard|^all$|workspace/i, LayoutGrid],
  [/deposit|withdraw|bank|reconcil/i, Landmark],
  [/report|statement|ledger|balance|book|trial/i, FileBarChart2],
  [/voucher|expense|receipt|payment|journal|contra/i, Receipt],
  [/approval/i, ShieldCheck],
  [/config|setting|categor/i, Settings],
  [/contact|customer|supplier|investor|party|team|member|employee|user/i, Users],
  [/bill|invoice|quote|order|agreement/i, FileText],
  [/asset/i, Boxes],
  [/budget|office|salary|pay/i, Wallet],
  [/project|site|flat|land|share/i, Building2],
  [/purchase|product|item|stock|sale|adjust|inventory/i, ShoppingBag],
  [/task|work/i, ListChecks],
  [/requisition|request/i, ClipboardList],
  [/lead|crm|call|visit|campaign|follow/i, Waypoints],
];
const iconFor = (item) => item.icon || ICON_RULES.find(([re]) => re.test(`${item.key} ${item.label}`))?.[1] || CircleDot;

// Top-level row: plain items (e.g. My Workspace) and the section headers.
// The current page is filled forest green; its section is just bolded.
function NavyRow({ item, active, inside, expanded, onClick }) {
  const Icon = iconFor(item);
  const lit = active;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-expanded={expanded === undefined ? undefined : expanded}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
        lit
          ? 'bg-forest font-semibold text-white shadow-sm'
          : inside
          ? 'font-semibold text-slate-900 hover:bg-stone-100'
          : 'font-medium text-slate-600 hover:bg-stone-100 hover:text-slate-900'
      }`}
    >
      <Icon size={16} strokeWidth={1.9} className={`shrink-0 ${lit ? 'text-lime-200' : inside ? 'text-forest' : 'text-slate-400'}`} />
      <span className="truncate">{item.label}</span>
      {expanded !== undefined && (
        <ChevronDown size={14} className={`ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${lit ? 'text-white/80' : 'text-slate-400'}`} />
      )}
    </button>
  );
}

// Pages inside an open section: slate text, forest-green active item.
function PanelLeaf({ item, active, onGo, nested }) {
  const Icon = nested ? null : iconFor(item);
  return (
    <button
      type="button"
      onClick={() => onGo(item.route)}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-[12px] text-left transition-colors ${
        nested ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13px]'
      } ${active ? 'bg-forest font-semibold text-white shadow-sm' : 'font-medium text-slate-600 hover:bg-stone-100 hover:text-slate-900'}`}
    >
      {Icon ? (
        <Icon size={15} strokeWidth={1.8} className={`shrink-0 ${active ? 'text-lime-200' : 'text-slate-400'}`} />
      ) : (
        <span className={`size-1.5 shrink-0 rounded-full ${active ? 'bg-lime-300' : 'bg-slate-300'}`} />
      )}
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function PanelGroup({ item, path, open, toggle, activeRoute, onGo, nested }) {
  const key = `${path}${item.key}`;
  const isOpen = Boolean(open[key]);
  const inside = contains(item, activeRoute);
  const Icon = nested ? null : iconFor(item);
  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-2.5 rounded-[12px] text-left transition-colors hover:bg-stone-100 hover:text-slate-900 ${
          nested ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13px]'
        } ${inside || isOpen ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}
      >
        {Icon ? (
          <Icon size={15} strokeWidth={1.8} className={`shrink-0 ${inside ? 'text-forest' : 'text-slate-400'}`} />
        ) : (
          <span className={`size-1.5 shrink-0 rounded-full ${inside ? 'bg-forest' : 'bg-slate-300'}`} />
        )}
        <span className="truncate">{item.label}</span>
        <ChevronDown size={13} className={`ml-auto shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mb-1 ml-3 mt-0.5 space-y-0.5 border-l border-stone-200 pl-2">
          <PanelItems items={item.children} path={`${key}/`} open={open} toggle={toggle} activeRoute={activeRoute} onGo={onGo} nested />
        </div>
      )}
    </div>
  );
}

function PanelItems({ items, path, open, toggle, activeRoute, onGo, nested = false }) {
  return items.map((child) =>
    child.children?.length ? (
      <PanelGroup key={child.key} item={child} path={path} open={open} toggle={toggle} activeRoute={activeRoute} onGo={onGo} nested={nested} />
    ) : (
      <PanelLeaf key={child.key} item={child} active={child.route === activeRoute} onGo={onGo} nested={nested} />
    )
  );
}

export default function AppSidebar({ mobileOpen = false, onMobileClose }) {
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
    if (route) {
      navigate(route);
      onMobileClose?.();
    }
  };

  if (!shouldShowSidebar(user) || !modules.length) return null;

  // Sections without sub-pages (e.g. My Workspace) are plain items; every
  // other section is an accordion row that opens its pages below it.
  // A section with its own page (e.g. Inventory -> its dashboard) that is not
  // already one of its sub-items gets an "Overview" item first.
  const withOverview = (m) =>
    m.route && !collectRoutes(m.children).includes(m.route)
      ? [{ key: `${m.key}-overview`, label: 'Overview', icon: LayoutGrid, route: m.route }, ...m.children]
      : m.children;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop: the sidebar is fixed to the viewport (full height, own scroll,
          footer pinned); this spacer reserves its width in the page flow. */}
      <div aria-hidden="true" className={`hidden shrink-0 transition-[width] duration-200 md:block print:hidden ${collapsed ? 'w-[68px]' : 'w-64'}`} />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col overflow-hidden border-r border-stone-200 bg-white text-slate-800 shadow-xl transition-transform duration-200
          md:z-30 md:shadow-none md:transition-[width]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-[68px]' : 'md:w-64'}
          print:hidden
        `}
        aria-label="Sidebar"
      >
        {/* Header: logo + three-dot expand/collapse toggle + mobile close */}
        <div className={`flex h-16 shrink-0 items-center border-b border-stone-100 ${collapsed ? 'flex-col justify-center gap-1 px-2 md:flex' : 'gap-2.5 px-4'}`}>
          {!collapsed && (
            <button type="button" onClick={() => navigate('/')} className="flex min-w-0 items-center gap-2.5 text-left">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-stone-200">
                <img src={companyLogo} alt="Trikon" className="h-full w-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-extrabold tracking-tight text-slate-900">TRIKON</span>
                  <span className="rounded-full bg-lime-200 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-forest">ERP</span>
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">Holdings</span>
              </span>
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsedSaved(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-stone-100 hover:text-slate-700 md:flex"
            >
              <EllipsisVertical size={18} />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-stone-100 hover:text-slate-700 md:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 [scrollbar-color:#d6d3d1_transparent] [scrollbar-width:thin] ${collapsed ? 'px-2' : 'px-3'}`}>
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
                    className={`flex size-11 items-center justify-center rounded-xl transition-colors ${
                      inside ? 'bg-forest text-lime-200 shadow-sm' : 'text-slate-500 hover:bg-stone-100 hover:text-slate-900'
                    }`}
                  >
                    {Icon ? <Icon size={18} strokeWidth={1.9} /> : <span className="text-xs font-bold">{m.label.charAt(0)}</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
              {modules.map((m) => {
                if (!m.children?.length) {
                  return m.route ? (
                    <NavyRow key={m.key} item={m} active={m.route === activeRoute} onClick={() => go(m.route)} />
                  ) : null;
                }
                const isOpen = Boolean(open[m.key]);
                return (
                  <div key={m.key}>
                    <NavyRow item={m} inside={contains(m, activeRoute)} expanded={isOpen} onClick={() => toggle(m.key)} />
                    {isOpen && (
                      <div className="mb-1.5 ml-[22px] mt-0.5 space-y-0.5 border-l border-stone-200 pl-2">
                        <PanelItems items={withOverview(m)} path={`${m.key}/`} open={open} toggle={toggle} activeRoute={activeRoute} onGo={go} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {!collapsed && (
          <div className="shrink-0 p-3">
            <div className="rounded-xl bg-stone-100 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-200 text-sm font-bold text-forest">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{user?.name || 'ERP User'}</p>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">{user?.role || 'user'}</p>
                </div>
              </div>
              <div className="mt-2.5 border-t border-stone-200 pt-2.5">
                <p className="truncate text-xs font-semibold text-slate-800">Trikon Holdings Limited</p>
                <p className="truncate text-[10px] text-slate-500">Real Estate &middot; Development &middot; Investment</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
