import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Grid2X2,
  Bell,
  Sun,
  Settings,
  ChevronDown,
  LogOut,
  CheckCheck,
  Inbox,
} from 'lucide-react';

import companyLogo from '../assets/trikon-logo.png';
import ModuleNav from './ModuleNav';
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
};

const NOTIFICATION_MODULE_MAP = {
  MaterialRequisitionQuotation: 'requisition',
  PurchaseOrderConfirmed: 'inventory',
  PurchaseOrderDelivered: 'inventory',
  InvoiceUploaded: 'inventory',
  DeliveryConfirmed: 'inventory',
  PaymentConfirmedBySupplier: 'inventory',
  PaymentRecorded: 'inventory',
};

export default function Topbar() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moduleCounts, setModuleCounts] = useState({});
  const profileRef = useRef(null);
  const notifRef = useRef(null);

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
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

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
    if (route && n.relatedId) navigate(route(n.relatedId));
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setModuleCounts({});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  return (
    <header className="sticky top-0 z-[9999] w-full">
      {/* =====================================================
          TOP HEADER
      ====================================================== */}
      <div className="relative z-20 h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* =================================================
              BRAND / LOGO
          ================================================== */}
          <div 
            onClick={() => navigate('/')} 
            className="flex min-w-fit cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs">
              <img
                src={companyLogo}
                alt="Trikon Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-[17px] font-black tracking-tight text-slate-900">
                  TRIKON
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-600">
                  ERP
                </span>
              </div>
              <p className="-mt-0.5 text-[10px] font-medium tracking-wide text-slate-400">
                Business Management
              </p>
            </div>
          </div>

          {/* =================================================
              SEARCH
          ================================================== */}
          <div className="mx-6 hidden max-w-md flex-1 md:block lg:mx-10">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Quick search modules, orders, records..."
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-12 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* =================================================
              ACTIONS
          ================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Button */}
            <button
              type="button"
              title="Search"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 md:hidden"
            >
              <Search size={16} />
            </button>

            {/* Applications */}
            <button
              type="button"
              title="Applications"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Grid2X2 size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              title="Theme"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:flex"
            >
              <Sun size={16} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                title="Notifications"
                onClick={toggleNotifications}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  notifOpen
                    ? 'border-slate-400 bg-slate-100 text-slate-900'
                    : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 flex max-h-[460px] w-[350px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:w-[380px]">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <Inbox size={28} className="mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-medium text-slate-500">No notifications right now</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">You're completely up to date!</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50/90 ${
                            !n.read ? 'bg-blue-50/40' : 'bg-white'
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              !n.read ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-transparent'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs leading-relaxed ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                              {n.message}
                            </p>
                            <span className="mt-1 block text-[10px] font-medium text-slate-400">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              type="button"
              title="Settings"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 md:flex"
            >
              <Settings size={16} />
            </button>

            <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-1 pr-2.5 transition-colors hover:border-slate-300"
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-xs">
                  A
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-xs font-semibold leading-tight text-slate-800">Admin User</p>
                  <p className="text-[10px] font-medium text-slate-400">Administrator</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden text-slate-400 transition-transform duration-200 lg:block ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-900">Admin User</p>
                    <p className="text-[10px] text-slate-400">admin@trikon.erp</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut size={14} />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FLOATING MENU ISLAND
      ====================================================== */}
      <div className="relative z-10 -mt-[1px] flex justify-center px-4">
        <ModuleNav badgeCounts={moduleCounts} />
      </div>
    </header>
  );
}