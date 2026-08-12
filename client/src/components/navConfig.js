import {
  LayoutGrid, Building2, ShoppingBag, ClipboardList, Calculator,
  UserRound, FileText, Grid3x3, Waypoints, Settings, UserPlus,
  MapPin, FileBarChart2,
} from 'lucide-react';

// A menu item is: { key, label, icon?, route: string|null, children?: MenuItem[] }
// `children` is used at every depth (including what used to be `submenu` on
// top-level items) so one recursive renderer can handle all of them.

const DASHBOARD_SUBPAGES = [
  { key: 'project', label: 'Project', icon: Building2, route: '/dashboard/project' },
  { key: 'inventory', label: 'Inventory', icon: ShoppingBag, route: '/dashboard/inventory' },
  { key: 'accounts', label: 'Accounts', icon: FileText, route: null },
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

// --- Inventory module ---
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
  { key: 'purchase-list', label: 'Purchase List', route: '/inventory-module/purchase' },
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
    route: null,
    children: [
      { key: 'purchase-details', label: 'Purchase Details', route: '/inventory-module/reports/purchase-details' },
      { key: 'purchase-order-receive-details', label: 'Purchase Order Receive Details', route: '/inventory-module/reports/purchase-order-receive-details' },
      { key: 'stock-report', label: 'Stock Report', route: '/inventory-module/reports/stock' },
      { key: 'material-usage-report', label: 'Material Usage Report', route: '/inventory-module/reports/material-usage' },
    ],
  },
];

// --- Requisition module ---
const REQUISITION_SUBPAGES = [
  { key: 'material-requisition', label: 'Material Requisition', route: '/requisition-module/material-requisition-list' },
  { key: 'service-work-requisition', label: 'Service/Work Requisition', route: '/requisition-module/service-work-requisition-list' },
  { key: 'fund-requisition', label: 'Fund Requisition', route: '/requisition-module/fund-requisition' },
  {
    key: 'reports',
    label: 'Reports',
    route: null,
    children: [
      { key: 'fund-requisition-report', label: 'Fund Requisition Report', route: '/requisition-module/reports/fund-requisition' },
    ],
  },
];

// --- Accounting module ---
const ACCOUNTING_SUBPAGES = [
  {
    key: 'configuration',
    label: 'Configuration',
    route: null,
    children: [
      { key: 'chart-of-group', label: 'Chart of Group', route: '/accounts-module/chart-group' },
      { key: 'chart-of-accounts', label: 'Chart of Accounts', route: '/accounts-module/chart-accounts' },
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
    children: [
      { key: 'asset-list', label: 'Asset List', route: '/accounts-module/asset_list' },
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
    route: null,
    children: [
      { key: 'payable-report', label: 'Payable Report', route: '/accounts-module/reports/payable-report' },
      { key: 'expense-report', label: 'Expense Report', route: '/accounts-module/reports/expense-report' },
      { key: 'receivable-report', label: 'Receivable Report', route: '/accounts-module/reports/receivable-report' },
      { key: 'day-book', label: 'Day Book', route: '/accounts-module/reports/day-book' },
      { key: 'receive-payment-statement', label: 'Receive Payment Statement', route: '/accounts-module/reports/receive-payment-statement' },
      { key: 'cash-bank-books', label: 'Cash/Bank Books', route: null },
      { key: 'general-ledger', label: 'General Ledger', route: null },
      { key: 'income-statement', label: 'Income Statement', route: null },
      { key: 'cash-flow-statement', label: 'Cash Flow Statement', route: null },
      { key: 'trial-balance', label: 'Trial Balance', route: null },
      { key: 'balance-sheet', label: 'Balance Sheet', route: null },
    ],
  },
];

// --- CRM module ---
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

export const TOP_MODULES = [
  { key: 'dashboards', label: 'Dashboards', icon: LayoutGrid, route: '/dashboard', children: DASHBOARD_SUBPAGES },
  { key: 'project', label: 'Project', icon: Building2, route: null, children: PROJECT_SUBPAGES },
  { key: 'inventory', label: 'Inventory', icon: ShoppingBag, route: '/dashboard/inventory', children: INVENTORY_SUBPAGES },
  { key: 'requisition', label: 'Requisition', icon: ClipboardList, route: null, children: REQUISITION_SUBPAGES },
  { key: 'accounts', label: 'Accounting', icon: Calculator, route: null, children: ACCOUNTING_SUBPAGES },
  { key: 'hrm', label: 'HRM', icon: UserRound, route: null },
  { key: 'crm', label: 'CRM', icon: FileText, route: null, children: CRM_SUBPAGES },
];