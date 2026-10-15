import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useInvestorPrivacy } from '../context/InvestorPrivacyContext';
import { getInboxSummary } from '../../api/portalInvestor';
import '../theme.css';

const svgProps = {
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  viewBox: '0 0 24 24',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const navItems = [
  {
    name: 'Home',
    path: '/portal/investor/dashboard',
    icon: (
      <svg {...svgProps}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: 'Investments',
    path: '/portal/investor/investments',
    icon: (
      <svg {...svgProps}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    name: 'History',
    path: '/portal/investor/history',
    mobile: false,
    icon: (
      <svg {...svgProps}>
        <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    name: 'Compare',
    path: '/portal/investor/compare',
    icon: (
      <svg {...svgProps}>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
      </svg>
    ),
  },
  {
    name: 'Payouts',
    path: '/portal/investor/payments',
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    name: 'Inbox',
    path: '/portal/investor/inbox',
    mobile: false, // mobile gets the envelope in the header instead
    badge: true,
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 6L2 7" />
      </svg>
    ),
  },
  {
    name: 'Profile',
    path: '/portal/investor/profile',
    icon: (
      <svg {...svgProps}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const InvestorPortalLayout = () => {
  const { isMasked, toggleMask } = useInvestorPrivacy();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('portalUser') || '{}');
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await getInboxSummary();
      setUnread(Number(res.data?.unreadMessages) || 0);
    } catch {
      /* the badge is a convenience: ignore failures */
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 60 * 1000);
    window.addEventListener('investor-inbox-updated', refreshUnread);
    return () => {
      clearInterval(timer);
      window.removeEventListener('investor-inbox-updated', refreshUnread);
    };
  }, [refreshUnread]);

  const handleLogout = () => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalUser');
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#0B1530] font-wealth-body flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Left Slim Rail */}
      <aside className="no-print hidden md:flex w-64 flex-col justify-between border-r border-[#E3E8F2] bg-white p-6 sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1530] text-white font-bold font-wealth-display">
              T
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#0B1530] font-wealth-display">TRIKON</h2>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Private Wealth</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#3347B8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#0B1530]'
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.name}</span>
                {item.badge && unread > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimalist Topbar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E8F2] bg-white/85 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1530] text-white font-bold text-xs">
              T
            </div>
            <span className="text-xs font-bold font-wealth-display tracking-tight">TRIKON WEALTH</span>
          </div>

          <div className="hidden md:block">
            <span className="text-xs text-slate-400">Account holder: </span>
            <span className="text-xs font-semibold text-slate-800">{user.name || 'Valued Investor'}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Inbox (mobile; desktop has it in the rail) */}
            <NavLink
              to="/portal/investor/inbox"
              aria-label={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 6L2 7" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>

            {/* Amount Privacy Mask Eye Toggle */}
            <button
              onClick={toggleMask}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              title={isMasked ? 'Show numbers' : 'Hide numbers'}
            >
              {isMasked ? (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <span className="text-[11px] hidden sm:inline">Hidden</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-[11px] hidden sm:inline">Amounts Visible</span>
                </>
              )}
            </button>

            <NavLink
              to="/portal/investor/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700"
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'I'}
            </NavLink>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-8 max-w-[1120px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#E3E8F2] bg-white py-2 backdrop-blur-md md:hidden">
        {navItems
          .filter((item) => item.mobile !== false)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#3347B8]' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
};

export default InvestorPortalLayout;