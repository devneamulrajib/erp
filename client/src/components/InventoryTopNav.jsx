import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Contact, ShoppingBasket, ShoppingBag, ArrowLeftRight,
  ClipboardList, FileBarChart, ChevronDown, Home,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'inventory', label: 'Inventory', icon: Box },
  { key: 'contact', label: 'Contact', icon: Contact },
  { key: 'products', label: 'Products', icon: ShoppingBasket },
  { key: 'purchase', label: 'Purchase', icon: ShoppingBag },
  { key: 'sales', label: 'Sales', icon: ShoppingBasket },
  { key: 'adjustment', label: 'Adjustment', icon: ArrowLeftRight },
  { key: 'material-requisition', label: 'Material Requisition', icon: ClipboardList },
  { key: 'flat-land', label: 'Flat/Land', icon: Home, path: '/inventory-module/flat' },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
];

export default function InventoryTopNav() {
  const [active, setActive] = useState('inventory');
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