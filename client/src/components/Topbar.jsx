// client/src/components/Topbar.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  CheckCheck,
  Inbox,
  LifeBuoy,
  ClipboardList,
  X,
  LayoutGrid,
  Users,
} from 'lucide-react';

import companyLogo from '../assets/trikon-logo.png';
import ModuleNav from './ModuleNav';
import SupportModal from './SupportModal';
import GlobalSearch from './GlobalSearch';
import {
  getNotifications,
  getUnreadCount,
  getUnreadCountByType,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';
import { canOpenAdminPage } from '../config/permissions';
import { shouldShowSidebar } from './navConfig';

const RELATED_ROUTES = {
  MaterialRequisitionQuotation: (id) => `/requisition-module/material-requisition-list?reviewId=${id}`,
  PurchaseOrderConfirmed: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  PurchaseOrderDelivered: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  InvoiceUploaded: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  DeliveryConfirmed: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  PaymentConfirmedBySupplier: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  PaymentRecorded: (id) => `/procurement-module/purchase-order-list?viewId=${id}`,
  EmployeeLeaveRequest: () => '/hrm-module/employee?tab=leave',
  EmployeeAdvanceRequest: () => '/hrm-module/employee?tab=advance',
  OfficeExpenseRequest: () => '/accounts-module/approval-center',
  OfficeExpenseApproved: () => '/accounts-module/office-expense-list',
  OfficeExpenseRejected: () => '/dashboard/accountant',
  PaymentVoucherRequest: () => '/accounts-module/approval-center',
  PaymentVoucherApproved: () => '/accounts-module/payment-list',
  PaymentVoucherRejected: () => '/dashboard/accountant',
  BudgetRequest: () => '/accounts-module/approval-center',
  BudgetApproved: () => '/accounts-module/office-budget',
  BudgetRejected: () => '/dashboard/accountant',
};

const NOTIFICATION_MODULE_MAP = {
  MaterialRequisitionQuotation: 'requisition',
  PurchaseOrderConfirmed: 'inventory',
  PurchaseOrderDelivered: 'inventory',
  InvoiceUploaded: 'inventory',
  DeliveryConfirmed: 'inventory',
  PaymentConfirmedBySupplier: 'inventory',
  PaymentRecorded: 'inventory',
  EmployeeLeaveRequest: 'hrm',
  EmployeeAdvanceRequest: 'hrm',
  OfficeExpenseRequest: 'accounts',
  OfficeExpenseApproved: 'accounts',
  OfficeExpenseRejected: 'accounts',
  PaymentVoucherRequest: 'accounts',
  PaymentVoucherApproved: 'accounts',
  PaymentVoucherRejected: 'accounts',
  BudgetRequest: 'accounts',
  BudgetApproved: 'accounts',
  BudgetRejected: 'accounts',
};

// Which menu item (key from navConfig) each notification type points to.
// This is what puts the badge on the exact entry inside the dropdown.
const NOTIFICATION_ITEM_MAP = {
  MaterialRequisitionQuotation: 'material-requisition',
  PurchaseOrderConfirmed: 'purchase-order-list',
  PurchaseOrderDelivered: 'purchase-order-list',
  InvoiceUploaded: 'purchase-order-list',
  DeliveryConfirmed: 'purchase-order-list',
  PaymentConfirmedBySupplier: 'purchase-order-list',
  PaymentRecorded: 'purchase-order-list',
  OfficeExpenseRequest: 'approval-center',
  PaymentVoucherRequest: 'approval-center',
  BudgetRequest: 'approval-center',
};

const MODULE_TAG_STYLES = {
  requisition: 'bg-amber-50 text-amber-700 border-amber-200/60',
  inventory: 'bg-sky-50 text-sky-700 border-sky-200/60',
  hrm: 'bg-purple-50 text-purple-700 border-purple-200/60',
  accounts: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  default: 'bg-slate-100 text-slate-700 border-slate-200/60',
};

export default function Topbar({ hideModuleNav = false }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moduleCounts, setModuleCounts] = useState({});
  const [itemCounts, setItemCounts] = useState({});

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);

  // Read current user
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userName = currentUser?.name || 'ERP User';
  const userRole = currentUser?.role || 'User';
  const userEmail = currentUser?.email || 'user@trikon.erp';
  const initial = (userName.charAt(0) || 'U').toUpperCase();
  const isAdmin = String(userRole).toLowerCase().includes('admin');
  // Tickets: admins as before, plus users explicitly granted the Support section.
  const canSeeTickets = isAdmin || canOpenAdminPage(currentUser, 'support');
  // Role users have the sidebar logo on desktop, so the topbar logo shows
  // only on mobile (sidebar is a closed drawer there). Admins: always.
  const hasSidebar = shouldShowSidebar(currentUser);

  // Admin + floating menu: at the very top of the page the topbar and the
  // ModuleNav island render as one surface; once scrolled the island floats
  // as before. Passive scroll listener, one rAF per frame.
  const mergeNav = isAdmin && !hideModuleNav;
  const [atTop, setAtTop] = useState(() => typeof window === 'undefined' || window.scrollY <= 4);
  useEffect(() => {
    if (!mergeNav) return undefined;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setAtTop(window.scrollY <= 4);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mergeNav]);
  const navMerged = mergeNav && atTop;
  const roleLabel = /super\s*_?\s*admin/i.test(userRole)
    ? 'Super Admin'
    : String(userRole).replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

  // Badge role color
  const roleBadgeStyle = useMemo(() => {
    const roleLower = String(userRole).toLowerCase();
    if (roleLower.includes('admin')) return 'bg-violet-100 text-violet-700 border-violet-200';
    if (roleLower.includes('account')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (roleLower.includes('procure') || roleLower.includes('inventory')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }, [userRole]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
        setMobileSearchOpen(false);
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh unread total + per-module + per-menu-item counts
  const refreshCount = useCallback(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {});
    getUnreadCountByType()
      .then((byType) => {
        const modules = {};
        const items = {};
        Object.entries(byType).forEach(([type, count]) => {
          const moduleKey = NOTIFICATION_MODULE_MAP[type];
          if (moduleKey) modules[moduleKey] = (modules[moduleKey] || 0) + count;
          const itemKey = NOTIFICATION_ITEM_MAP[type];
          if (itemKey) items[itemKey] = (items[itemKey] || 0) + count;
        });
        setModuleCounts(modules);
        setItemCounts(items);
      })
      .catch(() => {});
  }, []);

  // Poll notifications
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 15000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setProfileOpen(false);
    navigate('/login', { replace: true });
  }

  function toggleNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      getNotifications().then(setNotifications).catch(() => {});
    }
  }

  async function handleNotificationClick(n) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        refreshCount(); // clears the nav badges right away
      } catch { /* ignore */ }
    }
    setNotifOpen(false);
    const route = RELATED_ROUTES[n.type];
    if (route) {
      navigate(route(n.relatedId));
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setModuleCounts({});
      setItemCounts({});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, notifFilter]);

  // Profile menu (avatar + dropdown). Admins / superadmins get it where the
  // Support and Tickets buttons were, and those two live inside it; everyone
  // else keeps it at the far right with Support / Tickets as buttons.
  const profileMenu = (
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={profileOpen}
        className={
          isAdmin
            ? `flex h-10 items-center gap-2.5 rounded-xl bg-white pl-1 pr-2.5 ring-1 transition-all hover:bg-slate-50 hover:ring-slate-300 ${
                profileOpen ? 'bg-slate-50 ring-slate-300' : 'ring-slate-200/80'
              }`
            : 'flex items-center gap-2 rounded-xl p-1 transition-all hover:bg-slate-100/80'
        }
      >
        <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs ${isAdmin ? 'bg-gradient-to-tr from-navy to-cobalt-700' : 'bg-forest'}`}>
          {initial}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        {isAdmin ? (
          <div className="hidden min-w-0 flex-col text-left lg:flex">
            <span className="max-w-[140px] truncate text-[13px] font-semibold leading-4 text-slate-900">{userName}</span>
            <span className="max-w-[140px] truncate text-[11px] font-medium leading-4 text-slate-500">{roleLabel}</span>
          </div>
        ) : (
          <div className="hidden text-left lg:block">
            <p className="max-w-[110px] truncate text-xs font-bold text-slate-800 leading-tight">
              {userName}
            </p>
            <span className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${roleBadgeStyle}`}>
              {userRole}
            </span>
          </div>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isAdmin ? '' : 'hidden lg:block'} ${
            profileOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {profileOpen && (
        <div className={`absolute right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 ${isAdmin ? 'w-64' : 'w-56'}`} role="menu">
          {/* User info banner */}
          <div className="rounded-xl bg-slate-50/80 p-3 mb-1 border border-slate-100">
            <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
            <p className="truncate text-[11px] font-medium text-slate-400">{userEmail}</p>
            {isAdmin && (
              <span className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${roleBadgeStyle}`}>
                {userRole}
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/dashboard');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <LayoutGrid size={14} className="text-slate-400" />
                  Executive dashboard
                </button>
                {canSeeTickets && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/support-tickets');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ClipboardList size={14} className="text-slate-400" />
                    Support tickets
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings/users');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <Users size={14} className="text-slate-400" />
                  Team members
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setSupportOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LifeBuoy size={14} className="text-slate-400" />
              Help & Support
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-[9999] w-full">
        {/* Main Bar */}
        <div className={`relative z-20 h-16 w-full border-b bg-white/85 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
          navMerged ? 'border-transparent shadow-none' : 'border-slate-200/70 shadow-xs'
        }`}>
          <div className="mx-auto flex h-full w-full max-w-[1560px] items-center justify-between px-3 sm:px-6 lg:px-8">

            {/* BRAND + mobile menu trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => {
                  setMobileMenuOpen(true);
                  window.dispatchEvent(new CustomEvent('erp:open-sidebar'));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <Menu size={20} />
              </button>
              <div
                onClick={() => navigate('/')}
                className={`group flex cursor-pointer select-none items-center gap-3 ${hasSidebar ? 'md:hidden' : ''}`}
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 p-1.5 shadow-xs ring-1 ring-slate-900/10 transition-transform duration-200 group-hover:scale-105">
                  <img src={companyLogo} alt="Trikon Logo" className="h-full w-full object-contain" />
                </div>
                {/* Wordmark: spaced TRIKON, hairline divider, quiet two-line caption */}
                <div className="hidden items-center gap-3 sm:flex">
                  <span className="pl-[0.24em] text-[15px] font-semibold uppercase leading-none tracking-[0.24em] text-slate-900">
                    Trikon
                  </span>
                  <span className="h-7 w-px bg-stone-300/80" aria-hidden="true" />
                  <span className="flex flex-col gap-1 leading-none">
                    <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-stone-500">Holdings</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-forest/80">ERP</span>
                  </span>
                </div>
              </div>
            </div>

            {/* GLOBAL SEARCH DESKTOP */}
            <div className="mx-4 hidden max-w-lg flex-1 md:block lg:mx-8">
              <GlobalSearch
                ref={searchInputRef}
                showShortcut
                placeholder="Search modules, documents, vouchers, inventory..."
                inputClassName="h-9.5 w-full rounded-xl border border-slate-200/80 bg-slate-100/60 pl-10 pr-14 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 hover:bg-slate-100/90 focus:border-cobalt-300 focus:bg-white focus:ring-4 focus:ring-cobalt/10 shadow-inner"
              />
            </div>

            {/* ACTION ITEMS */}
            <div className="flex items-center gap-1 sm:gap-1.5">

              {/* Mobile Search Trigger */}
              <button
                type="button"
                aria-label="Search"
                onClick={() => setMobileSearchOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
              >
                <Search size={17} />
              </button>

              {/* Admins: profile / super admin menu here (Support + Tickets inside it) */}

              {/* Support modal button */}
              {!isAdmin && (
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="group hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 sm:flex"
              >
                <LifeBuoy size={16} className="text-slate-400 group-hover:text-slate-700" />
                <span>Support</span>
              </button>
              )}

              {/* Tickets (Support section holders; admins use the profile menu) */}
              {canSeeTickets && !isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/support-tickets')}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-gold px-3 text-xs font-semibold text-navy shadow-xs transition-all hover:bg-gold-600 hover:shadow"
                >
                  <ClipboardList size={15} />
                  <span className="hidden sm:inline">Tickets</span>
                </button>
              )}

              {/* NOTIFICATION CENTER */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={toggleNotifications}
                  className={`relative flex items-center justify-center transition-all ${
                    isAdmin
                      ? `h-10 w-10 rounded-xl bg-white ring-1 ${notifOpen ? 'bg-slate-50 text-slate-900 ring-slate-300' : 'text-slate-600 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300'}`
                      : `h-9 w-9 rounded-lg ${notifOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                  }`}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover */}
                {notifOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5 sm:w-[410px]">
                    {/* Header */}
                    <div className="border-b border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              {unreadCount} unread
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                          >
                            <CheckCheck size={13} />
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Filter tabs */}
                      <div className="mt-2.5 flex items-center gap-1">
                        <button
                          onClick={() => setNotifFilter('all')}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                            notifFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setNotifFilter('unread')}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                            notifFilter === 'unread'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Unread only
                        </button>
                      </div>
                    </div>

                    {/* Notification Items */}
                    <div className="divide-y divide-slate-100 overflow-y-auto">
                      {displayedNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2.5">
                            <Inbox size={20} />
                          </div>
                          <p className="text-xs font-semibold text-slate-800">No notifications to show</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">Everything is clear right now!</p>
                        </div>
                      ) : (
                        displayedNotifications.map((n) => {
                          const moduleKey = NOTIFICATION_MODULE_MAP[n.type] || 'default';
                          const tagStyle = MODULE_TAG_STYLES[moduleKey] || MODULE_TAG_STYLES.default;

                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`group flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 ${
                                !n.read ? 'bg-sky-50/30' : 'bg-white'
                              }`}
                            >
                              <div className="pt-0.5">
                                <span
                                  className={`block h-2 w-2 rounded-full ${
                                    !n.read ? 'bg-cobalt ring-2 ring-cobalt-100' : 'bg-transparent'
                                  }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tagStyle}`}>
                                    {moduleKey}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {new Date(n.createdAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                  {n.message}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile menu, right after the bell (admins: no divider, matching 40px controls) */}
              {isAdmin ? <span className="w-0.5" aria-hidden="true" /> : <div className="mx-1 h-5 w-px bg-slate-200" />}
              {profileMenu}
            </div>
          </div>

          {/* MOBILE SEARCH OVERLAY */}
          {mobileSearchOpen && (
            <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white p-3 shadow-lg md:hidden">
              <GlobalSearch
                autoFocus
                placeholder="Search anything..."
                onDone={() => setMobileSearchOpen(false)}
                inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-medium outline-none focus:border-cobalt-400 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* SUB NAVIGATION (ModuleNav) - hidden on mobile, shown in drawer instead */}
        {!hideModuleNav && (
          <div
            className={`relative z-10 -mt-[1px] hidden justify-center px-4 md:flex ${
              mergeNav
                ? `border-b pb-2 transition-[background-color,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
                    navMerged ? 'border-slate-200/70 bg-white/85 shadow-xs' : 'border-transparent bg-transparent shadow-none'
                  }`
                : ''
            }`}
          >
            <ModuleNav badgeCounts={moduleCounts} itemBadgeCounts={itemCounts} merged={navMerged} />
          </div>
        )}

        {/* MOBILE MODULE NAV DRAWER */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[10000] bg-black/40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-[10001] w-72 overflow-y-auto bg-white shadow-2xl md:hidden">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-sm font-bold text-slate-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-2">
                <ModuleNav
                  mobile
                  badgeCounts={moduleCounts}
                  itemBadgeCounts={itemCounts}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </>
        )}
      </header>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}