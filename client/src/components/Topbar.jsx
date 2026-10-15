// client/src/components/Topbar.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  CheckCheck,
  Inbox,
  LifeBuoy,
  ClipboardList,
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

const MODULE_TAG_STYLES = {
  requisition: 'bg-amber-50 text-amber-700 border-amber-200/60',
  inventory: 'bg-sky-50 text-sky-700 border-sky-200/60',
  hrm: 'bg-purple-50 text-purple-700 border-purple-200/60',
  accounts: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  default: 'bg-slate-100 text-slate-700 border-slate-200/60',
};

export default function Topbar() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moduleCounts, setModuleCounts] = useState({});

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

  // Poll notifications
  useEffect(() => {
    function refreshCount() {
      getUnreadCount().then(setUnreadCount).catch(() => {});
      getUnreadCountByType()
        .then((byType) => {
          const grouped = {};
          Object.entries(byType).forEach(([type, count]) => {
            const key = NOTIFICATION_MODULE_MAP[type];
            if (key) grouped[key] = (grouped[key] || 0) + count;
          });
          setModuleCounts(grouped);
        })
        .catch(() => {});
    }
    refreshCount();
    const interval = setInterval(refreshCount, 15000);
    return () => clearInterval(interval);
  }, []);

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
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, notifFilter]);

  return (
    <>
      <header className="sticky top-0 z-[9999] w-full">
        {/* Main Bar */}
        <div className="relative z-20 h-16 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-xs transition-all">
          <div className="mx-auto flex h-full w-full max-w-[1560px] items-center justify-between px-3 sm:px-6 lg:px-8">

            {/* BRAND */}
            <div
              onClick={() => navigate('/')}
              className="group flex cursor-pointer select-none items-center gap-3"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 p-1.5 shadow-xs ring-1 ring-slate-900/10 transition-transform duration-200 group-hover:scale-105">
                <img src={companyLogo} alt="Trikon Logo" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-[17px] font-extrabold tracking-tight text-slate-900">TRIKON</span>
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">ERP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Enterprise OS</p>
                </div>
              </div>
            </div>

            {/* GLOBAL SEARCH DESKTOP */}
            <div className="mx-4 hidden max-w-lg flex-1 md:block lg:mx-8">
              <GlobalSearch
                ref={searchInputRef}
                showShortcut
                placeholder="Search modules, documents, vouchers, inventory..."
                inputClassName="h-9.5 w-full rounded-xl border border-slate-200/80 bg-slate-100/60 pl-10 pr-14 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 hover:bg-slate-100/90 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5 shadow-inner"
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

              {/* Support modal button */}
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="group hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 sm:flex"
              >
                <LifeBuoy size={16} className="text-slate-400 group-hover:text-slate-700" />
                <span>Support</span>
              </button>

              {/* Tickets (Admin only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/support-tickets')}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-slate-800 hover:shadow"
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
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    notifOpen
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                                    !n.read ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-transparent'
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

              {/* Divider */}
              <div className="mx-1 h-5 w-px bg-slate-200" />

              {/* USER PROFILE DROPDOWN */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl p-1 transition-all hover:bg-slate-100/80"
                >
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-900 to-slate-700 text-xs font-bold text-white shadow-xs">
                    {initial}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="hidden text-left lg:block">
                    <p className="max-w-[110px] truncate text-xs font-bold text-slate-800 leading-tight">
                      {userName}
                    </p>
                    <span className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${roleBadgeStyle}`}>
                      {userRole}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`hidden text-slate-400 transition-transform duration-200 lg:block ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl ring-1 ring-black/5">
                    {/* User info banner */}
                    <div className="rounded-xl bg-slate-50/80 p-3 mb-1 border border-slate-100">
                      <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
                      <p className="truncate text-[11px] font-medium text-slate-400">{userEmail}</p>
                    </div>

                    <div className="space-y-0.5">
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
            </div>
          </div>

          {/* MOBILE SEARCH OVERLAY */}
          {mobileSearchOpen && (
            <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white p-3 shadow-lg md:hidden">
              <GlobalSearch
                autoFocus
                placeholder="Search anything..."
                onDone={() => setMobileSearchOpen(false)}
                inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-medium outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* SUB NAVIGATION (ModuleNav) */}
        <div className="relative z-10 -mt-[1px] flex justify-center px-4">
          <ModuleNav badgeCounts={moduleCounts} />
        </div>
      </header>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}