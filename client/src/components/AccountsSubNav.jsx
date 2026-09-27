import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Contact, Users, Settings, Receipt, Landmark,
  CreditCard, Home, Package, FileBarChart, ChevronDown,
} from 'lucide-react';

// Give any item a dropdown by adding a `children` array (same shape as below).
// Items with no `children` just navigate on click, like before — no chevron is shown for those.
// The Voucher/Reports child routes marked "placeholder" are guesses — swap in your real paths.
const NAV_ITEMS = [
  { key: 'accounts', label: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
  { key: 'contact', label: 'Contact', icon: Contact, path: '/accounts-module/customer-accounts' },
  { key: 'employee', label: 'Employee', icon: Users, path: null },
  { key: 'configuration', label: 'Configuration', icon: Settings, path: '/accounts-module/chart-group' },
  {
    key: 'voucher', label: 'Voucher', icon: Receipt, path: '/accounts-module/expense_list',
    children: [
      { label: 'Expense Voucher', path: '/accounts-module/expense_list' },
      { label: 'Payment Voucher', path: '/accounts-module/payment_list' }, // placeholder — verify route
      { label: 'Receipt Voucher', path: '/accounts-module/receipt_list' }, // placeholder — verify route
    ],
  },
  { key: 'bank-reconciliation', label: 'Bank Reconciliation', icon: Landmark, path: '/accounts-module/bank-reconciliation' },
  { key: 'billing', label: 'Billing', icon: CreditCard, path: '/billing/bill_list' },
  { key: 'flat-land', label: 'Flat/Land', icon: Home, path: '/inventory-module/flat' },
  { key: 'assets', label: 'Assets', icon: Package, path: '/accounts-module/asset_list' },
  {
    key: 'reports', label: 'Reports', icon: FileBarChart, path: '/accounts-module/reports/payable-report',
    children: [
      { label: 'Payable Report', path: '/accounts-module/reports/payable-report' },
      { label: 'Receivable Report', path: '/accounts-module/reports/receivable-report' }, // placeholder — verify route
      { label: 'Trial Balance', path: '/accounts-module/reports/trial-balance' }, // placeholder — verify route
    ],
  },
];

export default function AccountsSubNav() {
  const [active, setActive] = useState('accounts');
  const [menu, setMenu] = useState(null); // { key, top, left }
  const navigate = useNavigate();
  const navRef = useRef(null);

  useEffect(() => {
    if (!menu) return;

    const closeOnOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenu(null);
    };
    const closeOnEscape = (e) => e.key === 'Escape' && setMenu(null);

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menu]);

  const goTo = (path, key) => {
    setActive(key);
    setMenu(null);
    if (path) navigate(path);
  };

  const handleItemClick = (item, e) => {
    if (!item.children?.length) {
      goTo(item.path, item.key);
      return;
    }
    if (menu?.key === item.key) {
      setMenu(null);
      return;
    }
    // Anchor the dropdown to the button's on-screen position and render it
    // `fixed`, so the nav's `overflow-x-auto` can't clip it vertically.
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ key: item.key, top: rect.bottom + 6, left: rect.left });
  };

  const openItem = NAV_ITEMS.find((item) => item.key === menu?.key);

  return (
    <nav
      ref={navRef}
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto flex max-w-[1550px] items-center justify-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {NAV_ITEMS.map((item) => {
          const { key, label, icon: Icon, children } = item;
          const isActive = active === key;
          const isOpen = menu?.key === key;

          return (
            <button
              key={key}
              onClick={(e) => handleItemClick(item, e)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon size={15} />
              {label}
              {children?.length ? (
                <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      {openItem && (
        <div
          className="fixed z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-900/10"
          style={{ top: menu.top, left: menu.left }}
        >
          {openItem.children.map((child) => (
            <button
              key={child.path}
              onClick={() => goTo(child.path, openItem.key)}
              className="block w-full px-3.5 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}