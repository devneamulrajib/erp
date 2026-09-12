import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Contact, ShoppingBasket, ShoppingBag, ArrowLeftRight,
  ClipboardList, FileBarChart, ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Box,
    route: '/dashboard/inventory',
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: Contact,
    children: [
      { key: 'customer-accounts', label: 'Customer Accounts', route: '/accounts-module/customer-accounts' },
      { key: 'supplier-accounts', label: 'Supplier Accounts', route: '/accounts-module/supplier-accounts' },
    ],
  },
  {
    key: 'products',
    label: 'Products',
    icon: ShoppingBasket,
    children: [
      { key: 'category', label: 'Category', route: '/inventory-module/products/category' },
      { key: 'brand', label: 'Brand', route: '/inventory-module/products/brand' },
      { key: 'unit', label: 'Unit', route: '/inventory-module/products/unit' },
      { key: 'item-entry', label: 'Item Entry', route: '/inventory-module/products/item-entry' },
    ],
  },
  {
    key: 'purchase',
    label: 'Purchase',
    icon: ShoppingBag,
    children: [
      { key: 'add-purchase', label: 'Add Purchase', route: '/inventory-module/purchase' },
      { key: 'purchase-list', label: 'Purchase List', route: '/inventory-module/purchase-list' },
      { key: 'purchase-order', label: 'Purchase Order', route: '/procurement-module/purchase-order' },
      { key: 'purchase-order-list', label: 'Purchase Order List', route: '/procurement-module/purchase-order-list' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: ShoppingBasket,
    route: '/billing/item_sale_list',
  },
  {
    key: 'adjustment',
    label: 'Adjustment',
    icon: ArrowLeftRight,
    children: [
      { key: 'material-usage', label: 'Material Usage', route: '/inventory-module/material_usage' },
      { key: 'stock-transfer', label: 'Stock Transfer', route: '/inventory-module/stock_adjustment_list' },
    ],
  },
  {
    key: 'material-requisition',
    label: 'Material Requisition',
    icon: ClipboardList,
    route: '/requisition-module/material-requisition-list',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    children: [
      { key: 'purchase-details', label: 'Purchase Details', route: '/inventory-module/reports/purchase-details' },
      { key: 'purchase-order-receive-details', label: 'Purchase Order Receive Details', route: '/inventory-module/reports/purchase-order-receive-details' },
      { key: 'stock-report', label: 'Stock Report', route: '/inventory-module/reports/stock' },
      { key: 'material-usage-report', label: 'Material Usage Report', route: '/inventory-module/reports/material-usage' },
    ],
  },
];

function isItemActive(item, pathname) {
  if (item.route === pathname) return true;
  if (!item.children) return false;
  return item.children.some((c) => c.route === pathname);
}

export default function InventoryTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleTopClick(item) {
    if (item.children) {
      setOpenKey((k) => (k === item.key ? null : item.key));
    } else if (item.route) {
      navigate(item.route);
      setOpenKey(null);
    }
  }

  return (
    <nav ref={containerRef} className="relative bg-slate-900 px-3 py-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, location.pathname);
          const isOpen = openKey === item.key;

          return (
            <div key={item.key} className="relative shrink-0">
              <button
                onClick={() => handleTopClick(item)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {item.label}
                {item.children && (
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {item.children && isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/10 py-1.5 z-50">
                  {item.children.map((child) => {
                    const childActive = child.route === location.pathname;
                    return (
                      <Link
                        key={child.key}
                        to={child.route}
                        onClick={() => setOpenKey(null)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          childActive
                            ? 'text-indigo-600 bg-indigo-50 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}