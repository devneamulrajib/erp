// client/src/components/navConfig.jsx
// Floating-island navigation configuration for TRIKON ERP.

import {
  LayoutGrid,
  Building2,
  ShoppingBag,
  ClipboardList,
  Calculator,
  UserRound,
  FileText,
  Grid3x3,
  Waypoints,
  Settings,
  UserPlus,
  MapPin,
  FileBarChart2,
  Users,
  Wallet,
  HandCoins,
  ShieldCheck,
} from 'lucide-react';
import { canAccessModule } from '../config/permissions';

/* ============================================================
   FLOATING ISLAND UI CONFIG & ACCENTS
   ============================================================ */
export const NAV_UI_CONFIG = {
  variant: 'floating-island',
  position: 'top',
  alignment: 'center',
  height: 64,
  borderRadius: 24,
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
  island: {
    enabled: true,
    maxWidth: 1180,
    minHeight: 58,
    padding: 6,
    borderRadius: 22,
    shadow: '0 12px 35px rgba(15, 23, 42, 0.10), 0 3px 10px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(15, 23, 42, 0.07)',
    background: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
  },
  item: {
    height: 48,
    paddingX: 16,
    borderRadius: 17,
    iconSize: 18,
    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
    activeScale: 1,
    hoverScale: 1.015,
  },
  active: {
    background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    color: '#ffffff',
    boxShadow: '0 5px 16px rgba(15, 23, 42, 0.18)',
    borderRadius: 15,
  },
  dropdown: {
    width: 290,
    maxHeight: 540,
    borderRadius: 20,
    padding: 8,
    background: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(26px) saturate(180%)',
    border: '1px solid rgba(15, 23, 42, 0.07)',
    shadow: '0 20px 50px rgba(15, 23, 42, 0.14), 0 5px 18px rgba(15, 23, 42, 0.07)',
  },
  nested: {
    borderRadius: 14,
    padding: 7,
    background: '#f8fafc',
    itemHeight: 40,
    hoverBackground: '#eef2f7',
    activeBackground: '#e9eef5',
  },
  mobile: {
    height: 58,
    borderRadius: 20,
    horizontalPadding: 5,
    iconOnly: true,
    overflowX: 'auto',
  },
};

export const NAV_ACCENTS = {
  slate:   { color: '#334155', background: '#f1f5f9' },
  blue:    { color: '#2563eb', background: '#eff6ff' },
  emerald: { color: '#059669', background: '#ecfdf5' },
  amber:   { color: '#d97706', background: '#fffbeb' },
  indigo:  { color: '#4f46e5', background: '#eef2ff' },
  violet:  { color: '#7c3aed', background: '#f5f3ff' },
  rose:    { color: '#e11d48', background: '#fff1f2' },
  cyan:    { color: '#0891b2', background: '#ecfeff' },
};

/* ============================================================
   SUBPAGES CONFIGURATION
   ============================================================ */
const DASHBOARD_SUBPAGES = [
  { key: 'project', label: 'Project', icon: Building2, route: '/dashboard/project' },
  { key: 'inventory', label: 'Inventory', icon: ShoppingBag, route: '/dashboard/inventory' },
  { key: 'accounts', label: 'Accounts', icon: FileText, route: '/dashboard/accounts' },
  { key: 'hrm', label: 'HRM', icon: UserRound, route: null },
  { key: 'crm', label: 'CRM', icon: Waypoints, route: null },
  { key: 'all', label: 'All', icon: Grid3x3, route: '/dashboard' },
];

const PROJECT_SUBPAGES = [
  { key: 'project-type', label: 'Project Type', route: '/project-module/project-type' },
  { key: 'project', label: 'Project', route: '/project-module/projects' },
  { key: 'agreement', label: 'Agreement', route: '/accounts-module/agreement_list' },
  { key: 'party-list', label: 'Party List', route: '/accounts-module/party_list' },
  { key: 'site', label: 'Site', route: '/project-module/site' },
  {
    key: 'flat-land',
    label: 'Flat/Land',
    route: null,
    children: [
      { key: 'flat-land-item', label: 'Flat/Land', route: '/inventory-module/flat' },
      { key: 'flat-land-sale', label: 'Flat/Land Sale', route: '/inventory-module/flat-sale' },
      { key: 'installment-report', label: 'Installment Report', route: '/inventory-module/installment-report' },
    ],
  },
  {
    key: 'share-project',
    label: 'Share Project',
    route: null,
    children: [
      { key: 'assign-share', label: 'Assign Share', route: '/project-module/share-project/assign-share' },
      { key: 'share-report', label: 'Share Report', route: '/project-module/share-project/share-report' },
      { key: 'penalty-report', label: 'Penalty Report', route: '/project-module/share-project/penalty-report' },
      { key: 'project-share-configuration', label: 'Project Share Configuration', route: '/project-module/share-project/configuration' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    route: null,
    children: [
      { key: 'project-summary-report', label: 'Project Summary Report', route: '/project-module/reports/project-summary' },
      { key: 'project-progress-report', label: 'Project Progress Report', route: '/project-module/reports/project-progress' },
      { key: 'project-wise-income-statement', label: 'Project Wise Income Statement', route: '/project-module/reports/project-wise-income' },
      { key: 'site-wise-income-statement', label: 'Site Wise Income Statement', route: '/project-module/reports/site-wise-income' },
      { key: 'amount-usage-report', label: 'Amount Usage Report', route: '/project-module/reports/amount-usage' },
    ],
  },
];

const INVENTORY_SUBPAGES = [
  {
    key: 'products',
    label: 'Products',
    route: null,
    children: [
      { key: 'category', label: 'Category', route: '/inventory-module/products/category' },
      { key: 'brand', label: 'Brand', route: '/inventory-module/products/brand' },
      { key: 'unit', label: 'Unit', route: '/inventory-module/products/unit' },
      { key: 'item-entry', label: 'Item Entry', route: '/inventory-module/products/item-entry' },
    ],
  },
  { key: 'add-purchase', label: 'Add Purchase', route: '/inventory-module/purchase/add' },
  { key: 'purchase-list', label: 'Purchase List', route: '/inventory-module/purchase-list' },
  { key: 'purchase-order-list', label: 'Purchase Order List', route: '/procurement-module/purchase-order-list' },
  {
    key: 'adjustment',
    label: 'Adjustment',
    route: null,
    children: [
      { key: 'material-usage', label: 'Material Usage', route: '/inventory-module/material_usage' },
      { key: 'stock-transfer', label: 'Stock Transfer', route: '/inventory-module/stock_adjustment_list' },
    ],
  },
  { key: 'sales', label: 'Sales', route: '/billing/item_sale_list' },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    route: null,
    children: [
      { key: 'purchase-details', label: 'Purchase Details', route: '/inventory-module/reports/purchase-details' },
      { key: 'purchase-order-receive-details', label: 'Purchase Order Receive Details', route: '/inventory-module/reports/purchase-order-receive-details' },
      { key: 'stock-report', label: 'Stock Report', route: '/inventory-module/reports/stock' },
      { key: 'material-usage-report', label: 'Material Usage Report', route: '/inventory-module/reports/material-usage' },
    ],
  },
];

const REQUISITION_SUBPAGES = [
  { key: 'material-requisition', label: 'Material Requisition', route: '/requisition-module/material-requisition-list' },
  { key: 'service-work-requisition', label: 'Service/Work Requisition', route: '/requisition-module/service-work-requisition-list' },
  { key: 'fund-requisition', label: 'Fund Requisition', route: '/requisition-module/fund-requisition' },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    route: null,
    children: [
      { key: 'fund-requisition-report', label: 'Fund Requisition Report', route: '/requisition-module/reports/fund-requisition' },
    ],
  },
];

const ACCOUNTING_SUBPAGES = [
  {
    key: 'approval-center',
    label: 'Approval Center',
    icon: ShieldCheck,
    route: '/accounts-module/approval-center',
  },
  {
    key: 'accountant-requests',
    label: 'My Financial Requests',
    icon: ClipboardList,
    route: '/dashboard/accountant',
  },
  {
    key: 'configuration',
    label: 'Configuration',
    icon: Settings,
    route: null,
    children: [
      { key: 'chart-of-group', label: 'Chart of Group', route: '/accounts-module/chart-group' },
      { key: 'chart-of-accounts', label: 'Chart of Accounts', route: '/accounts-module/chart-accounts' },
      { key: 'bank-accounts', label: 'Bank Accounts', route: '/accounts-module/bank-accounts' },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    route: null,
    children: [
      { key: 'customer-accounts', label: 'Customer Accounts', route: '/accounts-module/customer-accounts' },
      { key: 'supplier-accounts', label: 'Supplier Accounts', route: '/accounts-module/supplier-accounts' },
      { key: 'investor', label: 'Investor', route: '/accounts-module/investor-accounts' },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    route: null,
    children: [
      {
        key: 'billing-configuration',
        label: 'Configuration',
        route: null,
        children: [
          { key: 'billing-category', label: 'Category', route: '/accounts-module/billing/category' },
          { key: 'billing-bill-item', label: 'Bill Item', route: '/inventory-module/bill-item' },
          { key: 'billing-service-work-name', label: 'Service/Work Name', route: '/item/service-view' },
          { key: 'billing-boq-title', label: 'BOQ Title', route: '/accounts-settings/title' },
        ],
      },
      { key: 'bill-invoice', label: 'Bill/Invoice', route: '/billing/bill_list' },
      { key: 'contractor-bill', label: 'Contractor Bill', route: '/billing/vendor_bill_list' },
      { key: 'labour-worker-bill', label: 'Labour/Worker Bill', route: '/service/labor-worker-bill-list' },
      { key: 'work-order', label: 'Work Order', route: '/billing/workorder_list' },
      { key: 'contractor-work-order', label: 'Contractor Work Order', route: '/billing/contractor-work-order-list' },
      { key: 'period-billing', label: 'Period Billing', route: '/billing/percentage_bill_list' },
      { key: 'adjustment-billing', label: 'Adjustment Billing', route: '/billing/adjustment_bill_list' },
      { key: 'quote', label: 'Quote', route: '/billing/quote-list' },
      { key: 'contractor-bill-report', label: 'Contractor Bill Report', route: '/billing/contractor_bill_report' },
    ],
  },
  {
    key: 'assets',
    label: 'Assets',
    route: null,
    children: [{ key: 'asset-list', label: 'Asset List', route: '/accounts-module/asset_list' }],
  },
  {
    key: 'office-budget',
    label: 'Office All',
    icon: Wallet,
    highlight: true,
    route: null,
    children: [
      { key: 'office-budget-tracker', label: 'Budget Tracker', route: '/accounts-module/office-budget' },
      { key: 'office-expense-list', label: 'Office Expense', route: '/accounts-module/office-expense-list' },
      { key: 'office-budget-categories', label: 'Budget Categories', route: '/accounts-module/budget-categories' },
      { key: 'office-budget-report', label: 'Office Report', route: '/accounts-module/office-report' },
    ],
  },
  {
    key: 'voucher',
    label: 'Voucher',
    route: null,
    children: [
      { key: 'expense-voucher', label: 'Expense', route: '/accounts-module/expense_list' },
      { key: 'receipt-voucher', label: 'Receipt Voucher', route: '/accounts-module/receipt-list' },
      { key: 'payment-voucher', label: 'Payment Voucher', route: '/accounts-module/payment-list' },
      { key: 'journal-voucher', label: 'Journal Voucher', route: '/accounts-module/journal_list' },
      { key: 'contra-voucher', label: 'Contra Voucher', route: '/accounts-module/contra_list' },
    ],
  },
  { key: 'bank-reconciliation', label: 'Bank Reconciliation', route: '/accounts-module/bank-reconciliation' },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    route: null,
    children: [
      { key: 'payable-report', label: 'Payable Report', route: '/accounts-module/reports/payable-report' },
      { key: 'expense-report', label: 'Expense Report', route: '/accounts-module/reports/expense-report' },
      { key: 'receivable-report', label: 'Receivable Report', route: '/accounts-module/reports/receivable-report' },
      { key: 'day-book', label: 'Day Book', route: '/accounts-module/reports/day-book' },
      { key: 'receive-payment-statement', label: 'Receive Payment Statement', route: '/accounts-module/reports/receive-payment-statement' },
      { key: 'cash-bank-books', label: 'Cash/Bank Books', route: '/accounts-module/reports/cash-bank-books' },
      { key: 'general-ledger', label: 'General Ledger', route: '/accounts-module/reports/general-ledger' },
      { key: 'income-statement', label: 'Income Statement', route: '/accounts-module/reports/income-statement' },
      { key: 'cash-flow-statement', label: 'Cash Flow Statement', route: '/accounts-module/reports/cash-flow-statement' },
      { key: 'trial-balance', label: 'Trial Balance', route: '/accounts-module/reports/trial-balance' },
      { key: 'balance-sheet', label: 'Balance Sheet', route: '/accounts-module/reports/balance-sheet' },
    ],
  },
];

const HRM_SUBPAGES = [
  // Direct Employees & Salary access
  { key: 'employee-list-direct', label: 'Employees & Salary', icon: Users, route: '/hrm-module/employee' },
  // Direct Advance Salary & Loan Request access
  { key: 'advance-loan-direct', label: 'Advance Salary / Loan', icon: HandCoins, route: '/hrm-module/employee' },

  // Setup / Sub-structure
  {
    key: 'employee-setup',
    label: 'Employee Setup',
    route: null,
    children: [
      { key: 'employee-list', label: 'Employee Directory', route: '/hrm-module/employee' },
      { key: 'department', label: 'Department', route: '/hrm-module/department' },
      { key: 'designation', label: 'Designation', route: '/hrm-module/designation' },
      { key: 'shift', label: 'Shift', route: '/hrm-module/shift' },
      { key: 'section', label: 'Section', route: '/hrm-module/section' },
      { key: 'unit', label: 'Unit', route: '/hrm-module/unit' },
      { key: 'increment', label: 'Increment', route: '/hrm-module/increment' },
    ],
  },
  { key: 'deduction-rules', label: 'Deduction Rules', route: '/hrm-module/deduction-rules' },
  { key: 'allowance-deduction', label: 'Allowance & Deduction', route: '/hrm-module/allowance-deduction' },
  { key: 'salary-grade', label: 'Salary Grade', route: '/hrm-module/salary-grade' },
  { key: 'attendance-log', label: 'Attendance Log', route: '/hrm-module/attendance-log' },
  { key: 'attendance', label: 'Attendance', route: '/hrm-module/attendance' },
  { key: 'pay-slip-process', label: 'Pay Slip Process', route: '/hrm-module/pay-slip-process' },
  { key: 'pay-slip', label: 'Pay Slip', route: '/hrm-module/pay-slip' },
  { key: 'bonus', label: 'Bonus', route: '/hrm-module/bonus' },
  { key: 'bonus-generate', label: 'Bonus Generate', route: '/hrm-module/bonus-generate' },
  { key: 'leave-type', label: 'Leave Type', route: '/hrm-module/leave-type' },
  { key: 'leave-application', label: 'Leave Application', route: '/hrm-module/leave-application' },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    route: null,
    children: [
      { key: 'daily-attendance-report', label: 'Daily Attendance Report', route: '/hrm-module/reports/daily-attendance' },
      { key: 'attendance-register', label: 'Attendance Register', route: '/hrm-module/reports/attendance-register' },
      { key: 'job-card', label: 'Job Card', route: '/hrm-module/reports/job-card' },
      { key: 'leave-report', label: 'Leave Report', route: '/hrm-module/reports/leave-report' },
      { key: 'salary-sheet', label: 'Salary Sheet', route: '/hrm-module/reports/salary-sheet' },
      { key: 'salary-due-report', label: 'Salary Due Report', route: '/hrm-module/reports/salary-due' },
    ],
  },
];

const CRM_SUBPAGES = [
  {
    key: 'configuration',
    label: 'Configuration',
    icon: Settings,
    route: null,
    children: [
      { key: 'communication-status', label: 'Communication Status', route: '/crm-module/communication_status' },
      { key: 'lead-category', label: 'Lead Category', route: '/crm-module/lead_category' },
      { key: 'campaign', label: 'Campaign', route: '/crm-module/campaign' },
      { key: 'profession', label: 'Profession', route: '/crm-module/profession' },
      { key: 'lead-source', label: 'Lead Source', route: '/crm-module/add-lead-source' },
      { key: 'offers', label: 'Offers', route: '/crm-module/feature' },
      { key: 'area', label: 'Area', route: '/crm-module/area' },
      { key: 'lead-stage', label: 'Lead Stage', route: '/crm-module/lead_status' },
    ],
  },
  { key: 'lead', label: 'Lead', icon: UserPlus, route: '/crm-module/lead' },
  {
    key: 'call-center',
    label: 'Call Center',
    route: null,
    children: [
      { key: 'follow-up', label: 'Follow Up', route: '/crm-module/call-center/follow-up' },
      { key: 'transfer', label: 'Transfer', route: '/crm-module/call-center/transfer' },
      { key: 'call-report', label: 'Call Report', route: '/crm-module/call-center/call-report' },
      { key: 'call-details-report', label: 'Call Details Report', route: '/crm-module/call-center/call-details-report' },
    ],
  },
  {
    key: 'visits',
    label: 'Visits',
    icon: MapPin,
    route: null,
    children: [
      { key: 'visits-list', label: 'Visits', route: '/crm-module/visits' },
      { key: 'visit-report', label: 'Visit Report', route: '/crm-module/visits/report' },
    ],
  },
  { key: 'user-wise-report', label: 'User Wise Report', icon: FileBarChart2, route: '/crm-module/user-wise-report' },
];

const SETTINGS_SUBPAGES = [
  { key: 'team-members', label: 'Team Members', icon: Users, route: '/settings/users' },
];

/* ============================================================
   TOP LEVEL MODULES
   ============================================================ */
export const TOP_MODULES = [
  { key: 'dashboards',  label: 'Dashboards', shortLabel: 'Home',     icon: LayoutGrid,    route: '/dashboard',           children: DASHBOARD_SUBPAGES,   ui: { priority: 1, accent: 'slate' } },
  { key: 'project',     label: 'Project',    shortLabel: 'Projects', icon: Building2,     route: null,                   children: PROJECT_SUBPAGES,     ui: { priority: 2, accent: 'blue' } },
  { key: 'inventory',   label: 'Inventory',  shortLabel: 'Stock',    icon: ShoppingBag,   route: '/dashboard/inventory', children: INVENTORY_SUBPAGES,   ui: { priority: 3, accent: 'emerald' } },
  { key: 'requisition', label: 'Requisition',shortLabel: 'Requests', icon: ClipboardList, route: null,                   children: REQUISITION_SUBPAGES, ui: { priority: 4, accent: 'amber' } },
  { key: 'accounts',    label: 'Accounting', shortLabel: 'Accounts', icon: Calculator,    route: null,                   children: ACCOUNTING_SUBPAGES,  ui: { priority: 5, accent: 'violet' } },
  { key: 'hrm',         label: 'HRM',        shortLabel: 'HR',       icon: UserRound,     route: null,                   children: HRM_SUBPAGES,         ui: { priority: 6, accent: 'rose' } },
  { key: 'crm',         label: 'CRM',        shortLabel: 'CRM',      icon: FileText,      route: null,                   children: CRM_SUBPAGES,         ui: { priority: 7, accent: 'cyan' } },
  { key: 'settings',    label: 'Settings',   shortLabel: 'Settings', icon: Settings,      route: null,                   children: SETTINGS_SUBPAGES,    ui: { priority: 8, accent: 'slate' } },
];

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */
export const menuContainsRoute = (item, pathname) => {
  if (!item) return false;
  if (item.route && item.route === pathname) return true;
  return Boolean(item.children?.some((child) => menuContainsRoute(child, pathname)));
};

export const getActiveTopModule = (pathname) =>
  TOP_MODULES.find((m) => menuContainsRoute(m, pathname)) || null;

export const getMenuPath = (pathname) => {
  const result = [];
  const search = (items, parents = []) => {
    for (const item of items) {
      const currentParents = [...parents, item];
      if (item.route === pathname) {
        result.push(...currentParents);
        return true;
      }
      if (item.children?.length && search(item.children, currentParents)) return true;
    }
    return false;
  };
  search(TOP_MODULES);
  return result;
};

export const getExpandableModules = () =>
  TOP_MODULES.filter((m) => m.children?.length > 0);

export const getFloatingIslandItems = () =>
  TOP_MODULES.map((m) => ({
    key: m.key,
    label: m.label,
    shortLabel: m.shortLabel || m.label,
    icon: m.icon,
    route: m.route,
    hasChildren: Boolean(m.children?.length),
    children: m.children || [],
    ui: m.ui || {},
  }));

export const findMenuItem = (key) => {
  const search = (items) => {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children?.length) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  return search(TOP_MODULES);
};

export const findMenuItemByRoute = (pathname) => {
  const search = (items) => {
    for (const item of items) {
      if (item.route === pathname) return item;
      if (item.children?.length) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  return search(TOP_MODULES);
};

export const getModulesForRole = (userOrRole) => {
  if (!userOrRole) return TOP_MODULES;
  return TOP_MODULES.filter((m) => canAccessModule(userOrRole, m.key));
};

export default TOP_MODULES;