import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FileCheck2,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  Banknote,
  Search,
  Bell,
} from 'lucide-react';
import { getPortalUser, portalLogout } from '../api/portalAuth';
import { PortalNotificationsProvider, usePortalNotifications } from '../context/PortalNotificationsContext';

const NAV_ITEMS = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/portal/invoices', label: 'Invoices', icon: Receipt, roles: null },
  { to: '/portal/quotes', label: 'Quotes', icon: FileCheck2, roles: ['customer'] },
  { to: '/portal/orders', label: 'Orders', icon: ShoppingCart, roles: ['supplier', 'vendor'] },
  { to: '/portal/material-requisitions', label: 'Requisitions', icon: ClipboardList, roles: ['supplier', 'vendor'] },
  { to: '/portal/employee/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['employee'] },
  { to: '/portal/employee/leave', label: 'Leave', icon: CalendarDays, roles: ['employee'] },
  { to: '/portal/employee/advance', label: 'Advance', icon: Banknote, roles: ['employee'] },
  { to: '/portal/requests', label: 'Requests', icon: MessageSquare, roles: ['customer', 'supplier', 'vendor'] },
];

function PortalLayoutInner({ children }) {
  const user = getPortalUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, notifications, refreshList, markAllRead } = usePortalNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifications(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function toggleNotifications() {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      await refreshList();
      if (unreadCount > 0) await markAllRead();
    }
  }

  function handleLogout() {
    portalLogout();
    navigate('/portal/login');
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));
  const initials = (user?.name || '?')
    .trim()
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 md:bg-slate-50">
      <div className="w-full max-w-md md:max-w-5xl mx-auto bg-white md:bg-transparent min-h-screen md:min-h-0 shadow-xl md:shadow-none shadow-slate-200/60 flex flex-col">
        {/* Top header */}
        <header className="px-5 md:px-0 pt-5 pb-4 md:py-6 border-b border-slate-100 md:border-none">
          <div className="flex items-center justify-between md:bg-white md:border md:border-slate-200 md:rounded-2xl md:px-5 md:py-3.5">
            <div className="flex items-center gap-3 md:gap-8 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  T
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm truncate">TRIKON</span>
                    {user?.role && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate hidden md:block">Business Portal</p>
                </div>
              </div>

              {/* Desktop inline nav — replaces the bottom tab bar above md */}
              <nav className="hidden md:flex items-center gap-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <Search size={16} />
              </button>
              <div className="relative" ref={panelRef}>
                <button
                  onClick={toggleNotifications}
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
                    <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      Notifications
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-slate-400 text-center">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="px-4 py-2.5 border-b border-slate-50 last:border-0">
                          <p className="text-xs text-slate-700">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="relative">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 md:px-0 py-5 pb-24 md:pb-10">{children}</main>

        {/* Bottom tab bar — mobile only; desktop uses the header nav instead */}
        <nav className="md:hidden sticky bottom-0 bg-white border-t border-slate-100 px-2 py-2 flex items-center justify-around">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                {active && <span className="w-1 h-1 rounded-full bg-slate-900" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }) {
  return (
    <PortalNotificationsProvider>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </PortalNotificationsProvider>
  );
}