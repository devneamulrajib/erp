import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Folder, Building2, UserSquare2, Banknote, Share2,
  ClipboardList, Receipt, Landmark, FileText, ChevronDown,
} from 'lucide-react';
import { menuContainsRoute } from './navConfig';

const ICONS = {
  'project-type': Building2,
  project: Building2,
  agreement: UserSquare2,
  'party-list': UserSquare2,
  site: Landmark,
  'flat-land': Landmark,
  'share-project': Share2,
  reports: FileText,
};

const SUBNAV_ITEMS = [
  {
    key: 'projects',
    label: 'Projects',
    icon: Folder,
    route: '/dashboard/project',
  },
  {
    key: 'project',
    label: 'Project',
    icon: Building2,
    children: [
      { key: 'project-type', label: 'Project Type', route: '/project-module/project-type' },
      { key: 'project', label: 'Project', route: '/project-module/projects' },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: UserSquare2,
    children: [
      { key: 'agreement', label: 'Agreement', route: '/accounts-module/agreement_list' },
      { key: 'party-list', label: 'Party List', route: '/accounts-module/party_list' },
    ],
  },
  {
    key: 'investment',
    label: 'Investment',
    icon: Banknote,
    children: [
      { key: 'investor', label: 'Investor Accounts', route: '/accounts-module/investor-accounts' },
    ],
  },
  {
    key: 'share-project',
    label: 'Share Project',
    icon: Share2,
    children: [
      { key: 'assign-share', label: 'Assign Share', route: '/project-module/share-project/assign-share' },
      { key: 'share-report', label: 'Share Report', route: '/project-module/share-project/share-report' },
      { key: 'penalty-report', label: 'Penalty Report', route: '/project-module/share-project/penalty-report' },
      { key: 'project-share-configuration', label: 'Project Share Configuration', route: '/project-module/share-project/configuration' },
    ],
  },
  {
    key: 'requisition',
    label: 'Requisition',
    icon: ClipboardList,
    children: [
      { key: 'material-requisition', label: 'Material Requisition', route: '/requisition-module/material-requisition-list' },
      { key: 'service-work-requisition', label: 'Service/Work Requisition', route: '/requisition-module/service-work-requisition-list' },
      { key: 'fund-requisition', label: 'Fund Requisition', route: '/requisition-module/fund-requisition' },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    icon: Receipt,
    children: [
      { key: 'bill-invoice', label: 'Bill/Invoice', route: '/billing/bill_list' },
      { key: 'quote', label: 'Quote', route: '/billing/quote-list' },
      { key: 'work-order', label: 'Work Order', route: '/billing/workorder_list' },
    ],
  },
  {
    key: 'flat-land',
    label: 'Flat/Land',
    icon: Landmark,
    children: [
      { key: 'flat-land-item', label: 'Flat/Land', route: '/inventory-module/flat' },
      { key: 'flat-land-sale', label: 'Flat/Land Sale', route: '/inventory-module/flat-sale' },
      { key: 'installment-report', label: 'Installment Report', route: '/inventory-module/installment-report' },
    ],
  },
  {
    key: 'document',
    label: 'Document',
    icon: FileText,
    children: [
      { key: 'project-summary-report', label: 'Project Summary Report', route: '/project-module/reports/project-summary' },
      { key: 'project-progress-report', label: 'Project Progress Report', route: '/project-module/reports/project-progress' },
      { key: 'project-wise-income-statement', label: 'Project Wise Income Statement', route: '/project-module/reports/project-wise-income' },
      { key: 'site-wise-income-statement', label: 'Site Wise Income Statement', route: '/project-module/reports/site-wise-income' },
      { key: 'amount-usage-report', label: 'Amount Usage Report', route: '/project-module/reports/amount-usage' },
    ],
  },
];

function isItemActive(item, pathname) {
  if (item.route === pathname) return true;
  if (!item.children) return false;
  return item.children.some((c) => c.route === pathname);
}

export default function ProjectSubNav() {
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
    <nav ref={containerRef} className="relative flex items-center gap-1 bg-slate-900 px-3 py-2 overflow-visible">
      {SUBNAV_ITEMS.map((item) => {
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
    </nav>
  );
}