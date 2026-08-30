import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Contact, Users, Settings, Receipt, Landmark,
  CreditCard, Home, Package, FileBarChart, ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'accounts', label: 'Accounts', icon: Wallet, path: '/dashboard/accounts' },
  { key: 'contact', label: 'Contact', icon: Contact, path: '/accounts-module/customer-accounts' },
  { key: 'employee', label: 'Employee', icon: Users, path: null },
  { key: 'configuration', label: 'Configuration', icon: Settings, path: '/accounts-module/chart-group' },
  { key: 'voucher', label: 'Voucher', icon: Receipt, path: '/accounts-module/expense_list' },
  { key: 'bank-reconciliation', label: 'Bank Reconciliation', icon: Landmark, path: '/accounts-module/bank-reconciliation' },
  { key: 'billing', label: 'Billing', icon: CreditCard, path: '/billing/bill_list' },
  { key: 'flat-land', label: 'Flat/Land', icon: Home, path: '/inventory-module/flat' },
  { key: 'assets', label: 'Assets', icon: Package, path: '/accounts-module/asset_list' },
  { key: 'reports', label: 'Reports', icon: FileBarChart, path: '/accounts-module/reports/payable-report' },
];

export default function AccountsSubNav() {
  const [active, setActive] = useState('accounts');
  const navigate = useNavigate();

  const handleClick = (item) => {
    setActive(item.key);
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 border-b border-gray-200 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const { key, label, icon: Icon } = item;
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => handleClick(item)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              isActive ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon size={15} />
            {label}
            <ChevronDown size={13} />
          </button>
        );
      })}
    </nav>
  );
}