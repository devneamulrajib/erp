import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectDashboard from './pages/ProjectDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import ProjectType from './pages/ProjectType'
import Project from './pages/Project'
import AgreementList from './pages/AgreementList'
import AgreementForm from './pages/AgreementForm'
import AgreementView from './pages/AgreementView'
import PartyList from './pages/PartyList'
import Site from './pages/Site'
import Flat from './pages/Flat'
import FlatSaleList from './pages/FlatSaleList'
import FlatSaleForm from './pages/FlatSaleForm'
import InstallmentReport from './pages/InstallmentReport'
import AssignShare from './pages/AssignShare'
import ShareReport from './pages/ShareReport'
import PenaltyReport from './pages/PenaltyReport'
import ProjectShareConfiguration from './pages/ProjectShareConfiguration'
import ProjectSummaryReport from './pages/ProjectSummaryReport'
import ProjectProgressReport from './pages/ProjectProgressReport'
import ProjectWiseIncomeStatement from './pages/ProjectWiseIncomeStatement'
import SiteWiseIncomeStatement from './pages/SiteWiseIncomeStatement'
import AmountUsageReport from './pages/AmountUsageReport'
import CategoryPage from './pages/CategoryPage'
import BrandPage from './pages/BrandPage'
import UnitPage from './pages/UnitPage'
import ItemPage from './pages/ItemPage'
import PurchasePage from './pages/PurchasePage'
import PurchaseList from './pages/PurchaseList'
import PurchaseOrderPage from './pages/PurchaseOrderPage'
import PurchaseOrderList from './pages/PurchaseOrderList'
import MaterialRequisitionList from './pages/MaterialRequisitionList'
import MaterialRequisitionPage from './pages/MaterialRequisitionPage'
import ServiceRequisitionList from './pages/ServiceRequisitionList'
import ServiceRequisitionPage from './pages/ServiceRequisitionPage'
import MaterialUsagePage from './pages/MaterialUsagePage'
import MaterialUsageList from './pages/MaterialUsageList'
import StockTransferPage from './pages/StockTransferPage'
import StockTransferList from './pages/StockTransferList'
import CommunicationStatusPage from './pages/CommunicationStatusPage'
import LeadCategoryPage from './pages/LeadCategoryPage'
import CampaignPage from './pages/CampaignPage'
import ProfessionPage from './pages/ProfessionPage'
import LeadSourcePage from './pages/LeadSourcePage'
import OfferPage from './pages/OfferPage'
import AreaPage from './pages/AreaPage'
import LeadStagePage from './pages/LeadStagePage'
import LeadPage from './pages/LeadPage'
import FollowUp from './pages/FollowUp'
import ChartOfGroupPage from './pages/ChartOfGroupPage'
import ChartOfGroupHierarchy from './pages/ChartOfGroupHierarchy'
import ChartOfAccountsPage from './pages/ChartOfAccountsPage'
import CustomerAccountsPage from './pages/CustomerAccountsPage'
import SupplierAccountsPage from './pages/SupplierAccountsPage'
import InvestorAccountsPage from './pages/InvestorAccountsPage'
import BillingCategoryPage from './pages/BillingCategoryPage'
import BillItemPage from './pages/BillItemPage'
import ServiceWorkNamePage from './pages/ServiceWorkNamePage'
import BoqTitlePage from './pages/BoqTitlePage'
import AssetListPage from './pages/AssetListPage'
import AssetFormPage from './pages/AssetFormPage'
import FundRequisitionList from './pages/FundRequisitionList'
import BillPage from './pages/BillPage'
import BillList from './pages/BillList'
import ContractorBillPage from './pages/ContractorBillPage'
import ContractorBillList from './pages/ContractorBillList'
import LabourWorkerBillPage from './pages/LabourWorkerBillPage'
import LabourWorkerBillList from './pages/LabourWorkerBillList'
import WorkorderPage from './pages/WorkorderPage'
import ContractorWorkorderPage from './pages/ContractorWorkorderPage'
import ContractorWorkorderList from './pages/ContractorWorkorderList'
import PeriodBillPage from './pages/PeriodBillPage'
import PeriodBillList from './pages/PeriodBillList'
import AdjustmentBillPage from './pages/AdjustmentBillPage'
import AdjustmentBillList from './pages/AdjustmentBillList'
import ExpenseListPage from './pages/ExpenseListPage'
import ExpensePage from './pages/ExpensePage'
import ReceiptVoucherPage from './pages/ReceiptVoucherPage'
import DayBookPage from './pages/DayBookPage'
import PayableReportPage from './pages/PayableReportPage'
import ExpenseReportPage from './pages/ExpenseReportPage'
import ReceivableReportPage from './pages/ReceivableReportPage'
import ReceivePaymentStatementPage from './pages/ReceivePaymentStatementPage'
import BankReconciliationPage from './pages/BankReconciliationPage'
import FundRequisitionReportPage from './pages/FundRequisitionReportPage'
import SaleList from './pages/SaleList'
import SalePage from './pages/SalePage'
import QuotePage from './pages/QuotePage'
import QuoteList from './pages/QuoteList'
import PaymentVoucherPage from './pages/PaymentVoucherPage'
import ContractorBillReportPage from './pages/ContractorBillReportPage'
import JournalVoucherListPage from './pages/JournalVoucherListPage'
import JournalVoucherPage from './pages/JournalVoucherPage'
import ContraVoucherListPage from './pages/ContraVoucherListPage'
import ContraVoucherPage from './pages/ContraVoucherPage'
import WorkorderList from './pages/WorkorderList'
import StockReportPage from './pages/StockReportPage'
import EmployeeListPage from './pages/EmployeeListPage'
import MaterialUsageReportPage from './pages/MaterialUsageReportPage'
import PurchaseDetailsReportPage from './pages/PurchaseDetailsReportPage'
import PurchaseOrderReceiveReportPage from './pages/PurchaseOrderReceiveReportPage'
import AccountsDashboard from './pages/AccountsDashboard'
import CashBankBookPage from './pages/CashBankBookPage'
import BankAccountPage from './pages/BankAccountPage'
import GeneralLedgerPage from './pages/GeneralLedgerPage'
import CashFlowStatementPage from './pages/CashFlowStatementPage'
import IncomeStatementPage from './pages/IncomeStatementPage'
import TrialBalancePage from './pages/TrialBalancePage'
import BalanceSheetPage from './pages/BalanceSheetPage'
import WorkorderInvoice from './pages/WorkorderInvoice'

// --- Office budget module ---
import BudgetCategoryPage from './pages/BudgetCategoryPage'
import OfficeBudgetPage from './pages/OfficeBudgetPage'
import OfficeExpensePage from './pages/OfficeExpensePage'
import OfficeExpenseListPage from './pages/OfficeExpenseListPage'
import OfficeReportPage from './pages/OfficeReportPage'

// --- Portal ---
import PortalInvoices from './portal/pages/PortalInvoices'
import PortalQuotesPage from './portal/pages/PortalQuotesPage'
import PortalOrdersPage from './portal/pages/PortalOrdersPage'
import PortalRequestsPage from './portal/pages/PortalRequestsPage'
import PortalPurchaseOrderView from './portal/pages/PortalPurchaseOrderView'
import PortalMaterialRequisitionsPage from './portal/pages/PortalMaterialRequisitionsPage'
import PortalMaterialRequisitionView from './portal/pages/PortalMaterialRequisitionView'
import PortalLogin from './portal/pages/PortalLogin'
import PortalDashboard from './portal/pages/PortalDashboard'
import PortalEmployeeDashboard from './portal/pages/PortalEmployeeDashboard'
import PortalLeaveRequestPage from './portal/pages/PortalLeaveRequestPage'
import PortalAdvanceRequestPage from './portal/pages/PortalAdvanceRequestPage'
import PortalProtectedRoute from './portal/components/PortalProtectedRoute'

// --- Team members / role-based access ---
import UserManagementPage from './pages/UserManagementPage'
import { canAccessModule, getModuleForPath } from './config/permissions'

import './App.css'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const moduleKey = getModuleForPath(location.pathname);

  if (user && moduleKey && !canAccessModule(user.role, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AdminOnlyRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user || !['superadmin', 'admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PortalPublicOnlyRoute({ children }) {
  const token = localStorage.getItem('portalToken');
  if (token) {
    return <Navigate to="/portal/dashboard" replace />;
  }
  return children;
}

// Employees and customers/suppliers land on different dashboards after
// login, but both use the same /portal/dashboard URL.
function PortalDashboardRouter() {
  const raw = localStorage.getItem('portalUser');
  const user = raw ? JSON.parse(raw) : null;
  return user?.role === 'employee' ? <PortalEmployeeDashboard /> : <PortalDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/project" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />
        <Route path="/project-module/project-type" element={<ProtectedRoute><ProjectType /></ProtectedRoute>} />
        <Route path="/project-module/projects" element={<ProtectedRoute><Project /></ProtectedRoute>} />
        <Route path="/accounts-module/agreement_list" element={<ProtectedRoute><AgreementList /></ProtectedRoute>} />
        <Route path="/accounts-module/agreement_list_add" element={<ProtectedRoute><AgreementForm /></ProtectedRoute>} />
        <Route path="/accounts-module/agreement_list_add/:id" element={<ProtectedRoute><AgreementForm /></ProtectedRoute>} />
        <Route path="/accounts-module/agreement_list_view/:id" element={<ProtectedRoute><AgreementView /></ProtectedRoute>} />
        <Route path="/accounts-module/party_list" element={<ProtectedRoute><PartyList /></ProtectedRoute>} />
        <Route path="/project-module/site" element={<ProtectedRoute><Site /></ProtectedRoute>} />
        <Route path="/inventory-module/flat" element={<ProtectedRoute><Flat /></ProtectedRoute>} />
        <Route path="/inventory-module/flat-sale" element={<ProtectedRoute><FlatSaleList /></ProtectedRoute>} />
        <Route path="/inventory-module/flat-sale/add" element={<ProtectedRoute><FlatSaleForm /></ProtectedRoute>} />
        <Route path="/inventory-module/flat-sale/add/:id" element={<ProtectedRoute><FlatSaleForm /></ProtectedRoute>} />
        <Route path="/inventory-module/installment-report" element={<ProtectedRoute><InstallmentReport /></ProtectedRoute>} />
        <Route path="/project-module/share-project/assign-share" element={<ProtectedRoute><AssignShare /></ProtectedRoute>} />
        <Route path="/project-module/share-project/share-report" element={<ProtectedRoute><ShareReport /></ProtectedRoute>} />
        <Route path="/project-module/share-project/penalty-report" element={<ProtectedRoute><PenaltyReport /></ProtectedRoute>} />
        <Route path="/project-module/share-project/configuration" element={<ProtectedRoute><ProjectShareConfiguration /></ProtectedRoute>} />
        <Route path="/project-module/reports/project-summary" element={<ProtectedRoute><ProjectSummaryReport /></ProtectedRoute>} />
        <Route path="/project-module/reports/project-progress" element={<ProtectedRoute><ProjectProgressReport /></ProtectedRoute>} />
        <Route path="/project-module/reports/project-wise-income" element={<ProtectedRoute><ProjectWiseIncomeStatement /></ProtectedRoute>} />
        <Route path="/project-module/reports/site-wise-income" element={<ProtectedRoute><SiteWiseIncomeStatement /></ProtectedRoute>} />
        <Route path="/project-module/reports/amount-usage" element={<ProtectedRoute><AmountUsageReport /></ProtectedRoute>} />
        <Route path="/inventory-module/products/category" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
        <Route path="/inventory-module/products/brand" element={<ProtectedRoute><BrandPage /></ProtectedRoute>} />
        <Route path="/inventory-module/products/unit" element={<ProtectedRoute><UnitPage /></ProtectedRoute>} />
        <Route path="/inventory-module/products/item-entry" element={<ProtectedRoute><ItemPage /></ProtectedRoute>} />
        <Route path="/inventory-module/purchase" element={<ProtectedRoute><PurchasePage /></ProtectedRoute>} />
        <Route path="/inventory-module/purchase/:id" element={<ProtectedRoute><PurchasePage /></ProtectedRoute>} />
        <Route path="/inventory-module/purchase-list" element={<ProtectedRoute><PurchaseList /></ProtectedRoute>} />
        <Route path="/procurement-module/purchase-order" element={<ProtectedRoute><PurchaseOrderPage /></ProtectedRoute>} />
        <Route path="/procurement-module/purchase-order/:id" element={<ProtectedRoute><PurchaseOrderPage /></ProtectedRoute>} />
        <Route path="/procurement-module/purchase-order-list" element={<ProtectedRoute><PurchaseOrderList /></ProtectedRoute>} />
        <Route path="/requisition-module/material-requisition-list" element={<ProtectedRoute><MaterialRequisitionList /></ProtectedRoute>} />
        <Route path="/requisition-module/material-requisition-add" element={<ProtectedRoute><MaterialRequisitionPage /></ProtectedRoute>} />
        <Route path="/requisition-module/material-requisition-add/:id" element={<ProtectedRoute><MaterialRequisitionPage /></ProtectedRoute>} />
        <Route path="/requisition-module/service-work-requisition-list" element={<ProtectedRoute><ServiceRequisitionList /></ProtectedRoute>} />
        <Route path="/requisition-module/service-work-requisition-add" element={<ProtectedRoute><ServiceRequisitionPage /></ProtectedRoute>} />
        <Route path="/requisition-module/service-work-requisition-add/:id" element={<ProtectedRoute><ServiceRequisitionPage /></ProtectedRoute>} />
        <Route path="/inventory-module/materialusage" element={<ProtectedRoute><MaterialUsagePage /></ProtectedRoute>} />
        <Route path="/inventory-module/materialusage/:id" element={<ProtectedRoute><MaterialUsagePage /></ProtectedRoute>} />
        <Route path="/inventory-module/material_usage" element={<ProtectedRoute><MaterialUsageList /></ProtectedRoute>} />
        <Route path="/inventory-module/stock_adjustment" element={<ProtectedRoute><StockTransferPage /></ProtectedRoute>} />
        <Route path="/inventory-module/stock_adjustment/:id" element={<ProtectedRoute><StockTransferPage /></ProtectedRoute>} />
        <Route path="/inventory-module/stock_adjustment_list" element={<ProtectedRoute><StockTransferList /></ProtectedRoute>} />
        <Route path="/crm-module/communication_status" element={<ProtectedRoute><CommunicationStatusPage /></ProtectedRoute>} />
        <Route path="/crm-module/lead_category" element={<ProtectedRoute><LeadCategoryPage /></ProtectedRoute>} />
        <Route path="/crm-module/campaign" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
        <Route path="/crm-module/profession" element={<ProtectedRoute><ProfessionPage /></ProtectedRoute>} />
        <Route path="/crm-module/add-lead-source" element={<ProtectedRoute><LeadSourcePage /></ProtectedRoute>} />
        <Route path="/crm-module/feature" element={<ProtectedRoute><OfferPage /></ProtectedRoute>} />
        <Route path="/crm-module/area" element={<ProtectedRoute><AreaPage /></ProtectedRoute>} />
        <Route path="/crm-module/lead_status" element={<ProtectedRoute><LeadStagePage /></ProtectedRoute>} />
        <Route path="/crm-module/lead" element={<ProtectedRoute><LeadPage /></ProtectedRoute>} />
        <Route path="/crm-module/call-center/follow-up" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
        <Route path="/accounts-module/chart-group" element={<ProtectedRoute><ChartOfGroupPage /></ProtectedRoute>} />
        <Route path="/accounts-module/chart-group-hierarchy" element={<ProtectedRoute><ChartOfGroupHierarchy /></ProtectedRoute>} />
        <Route path="/accounts-module/chart-accounts" element={<ProtectedRoute><ChartOfAccountsPage /></ProtectedRoute>} />
        <Route path="/accounts-module/customer-accounts" element={<ProtectedRoute><CustomerAccountsPage /></ProtectedRoute>} />
        <Route path="/accounts-module/supplier-accounts" element={<ProtectedRoute><SupplierAccountsPage /></ProtectedRoute>} />
        <Route path="/accounts-module/investor-accounts" element={<ProtectedRoute><InvestorAccountsPage /></ProtectedRoute>} />
        <Route path="/accounts-module/billing/category" element={<ProtectedRoute><BillingCategoryPage /></ProtectedRoute>} />
        <Route path="/inventory-module/bill-item" element={<ProtectedRoute><BillItemPage /></ProtectedRoute>} />
        <Route path="/item/service-view" element={<ProtectedRoute><ServiceWorkNamePage /></ProtectedRoute>} />
        <Route path="/accounts-settings/title" element={<ProtectedRoute><BoqTitlePage /></ProtectedRoute>} />
        <Route path="/accounts-module/asset_list" element={<ProtectedRoute><AssetListPage /></ProtectedRoute>} />
        <Route path="/accounts-module/asset_list_add" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />
        <Route path="/accounts-module/asset_list_add/:id" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />
        <Route path="/requisition-module/fund-requisition" element={<ProtectedRoute><FundRequisitionList /></ProtectedRoute>} />
        <Route path="/billing/bill_list" element={<ProtectedRoute><BillList /></ProtectedRoute>} />
        <Route path="/billing/bill" element={<ProtectedRoute><BillPage /></ProtectedRoute>} />
        <Route path="/billing/bill/:id" element={<ProtectedRoute><BillPage /></ProtectedRoute>} />
        <Route path="/billing/vendor_bill_list" element={<ProtectedRoute><ContractorBillList /></ProtectedRoute>} />
        <Route path="/billing/contract_bill" element={<ProtectedRoute><ContractorBillPage /></ProtectedRoute>} />
        <Route path="/billing/contract_bill/:id" element={<ProtectedRoute><ContractorBillPage /></ProtectedRoute>} />
        <Route path="/service/labor-worker-bill-list" element={<ProtectedRoute><LabourWorkerBillList /></ProtectedRoute>} />
        <Route path="/service/labor-worker-bill-add" element={<ProtectedRoute><LabourWorkerBillPage /></ProtectedRoute>} />
        <Route path="/service/labor-worker-bill-add/:id" element={<ProtectedRoute><LabourWorkerBillPage /></ProtectedRoute>} />
        <Route path="/billing/workorder_list" element={<ProtectedRoute><WorkorderList /></ProtectedRoute>} />
        <Route path="/billing/workorder" element={<ProtectedRoute><WorkorderPage /></ProtectedRoute>} />
        <Route path="/billing/workorder/:id" element={<ProtectedRoute><WorkorderPage /></ProtectedRoute>} />
        <Route path="/billing/contractor-work-order-list" element={<ProtectedRoute><ContractorWorkorderList /></ProtectedRoute>} />
        <Route path="/billing/contractor-workorder" element={<ProtectedRoute><ContractorWorkorderPage /></ProtectedRoute>} />
        <Route path="/billing/contractor-workorder/:id" element={<ProtectedRoute><ContractorWorkorderPage /></ProtectedRoute>} />
        <Route path="/billing/percentage_bill_list" element={<ProtectedRoute><PeriodBillList /></ProtectedRoute>} />
        <Route path="/billing/period-bill-add" element={<ProtectedRoute><PeriodBillPage /></ProtectedRoute>} />
        <Route path="/billing/period-bill-add/:id" element={<ProtectedRoute><PeriodBillPage /></ProtectedRoute>} />
        <Route path="/billing/adjustment_bill_list" element={<ProtectedRoute><AdjustmentBillList /></ProtectedRoute>} />
        <Route path="/billing/adjustment-bill" element={<ProtectedRoute><AdjustmentBillPage /></ProtectedRoute>} />
        <Route path="/billing/adjustment-bill/:id" element={<ProtectedRoute><AdjustmentBillPage /></ProtectedRoute>} />
        <Route path="/accounts-module/expense_list" element={<ProtectedRoute><ExpenseListPage /></ProtectedRoute>} />
        <Route path="/accounts-module/expense" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
        <Route path="/accounts-module/expense/:id" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
        <Route path="/accounts-module/receipt-list" element={<ProtectedRoute><ReceiptVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/receipt-list/add" element={<ProtectedRoute><ReceiptVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/payable-report" element={<ProtectedRoute><PayableReportPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/receivable-report" element={<ProtectedRoute><ReceivableReportPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/day-book" element={<ProtectedRoute><DayBookPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/receive-payment-statement" element={<ProtectedRoute><ReceivePaymentStatementPage /></ProtectedRoute>} />
        <Route path="/accounts-module/bank-reconciliation" element={<ProtectedRoute><BankReconciliationPage /></ProtectedRoute>} />
        <Route path="/requisition-module/reports/fund-requisition" element={<ProtectedRoute><FundRequisitionReportPage /></ProtectedRoute>} />
        <Route path="/billing/item_sale_list" element={<ProtectedRoute><SaleList /></ProtectedRoute>} />
        <Route path="/billing/item-sale-create" element={<ProtectedRoute><SalePage /></ProtectedRoute>} />
        <Route path="/billing/item-sale-create/:id" element={<ProtectedRoute><SalePage /></ProtectedRoute>} />
        <Route path="/billing/quote-list" element={<ProtectedRoute><QuoteList /></ProtectedRoute>} />
        <Route path="/billing/quote" element={<ProtectedRoute><QuotePage /></ProtectedRoute>} />
        <Route path="/billing/quote/:id" element={<ProtectedRoute><QuotePage /></ProtectedRoute>} />
        <Route path="/accounts-module/payment-list" element={<ProtectedRoute><PaymentVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/payment-list/add" element={<ProtectedRoute><PaymentVoucherPage /></ProtectedRoute>} />
        <Route path="/billing/contractor_bill_report" element={<ProtectedRoute><ContractorBillReportPage /></ProtectedRoute>} />
        <Route path="/accounts-module/journal_list" element={<ProtectedRoute><JournalVoucherListPage /></ProtectedRoute>} />
        <Route path="/accounts-module/journal_list_add" element={<ProtectedRoute><JournalVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/journal_list_add/:id" element={<ProtectedRoute><JournalVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/contra_list" element={<ProtectedRoute><ContraVoucherListPage /></ProtectedRoute>} />
        <Route path="/accounts-module/contra_list_add" element={<ProtectedRoute><ContraVoucherPage /></ProtectedRoute>} />
        <Route path="/accounts-module/contra_list_add/:id" element={<ProtectedRoute><ContraVoucherPage /></ProtectedRoute>} />
        <Route path="/inventory-module/reports/stock" element={<ProtectedRoute><StockReportPage /></ProtectedRoute>} />
        
        {/* ========================================================
            --- HRM MODULE ROUTES ---
        ======================================================== */}
        <Route path="/hrm-module/employee" element={<ProtectedRoute><EmployeeListPage /></ProtectedRoute>} />
        <Route path="/hrm-module/reports/:reportName" element={<ProtectedRoute><EmployeeListPage /></ProtectedRoute>} />
        <Route path="/hrm-module/:subpage" element={<ProtectedRoute><EmployeeListPage /></ProtectedRoute>} />

        <Route path="/dashboard/accounts" element={<ProtectedRoute><AccountsDashboard /></ProtectedRoute>} />
        <Route path="/inventory-module/reports/purchase-order-receive-details" element={<ProtectedRoute><PurchaseOrderReceiveReportPage /></ProtectedRoute>} />
        <Route path="/inventory-module/reports/material-usage" element={<ProtectedRoute><MaterialUsageReportPage /></ProtectedRoute>} />
        <Route path="/billing/workorder/:id/invoice" element={<ProtectedRoute><WorkorderInvoice /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/cash-bank-books" element={<ProtectedRoute><CashBankBookPage /></ProtectedRoute>} />
        <Route path="/accounts-module/bank-accounts" element={<ProtectedRoute><BankAccountPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/general-ledger" element={<ProtectedRoute><GeneralLedgerPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/income-statement" element={<ProtectedRoute><IncomeStatementPage /></ProtectedRoute>} />
        <Route path="/inventory-module/reports/purchase-details" element={<ProtectedRoute><PurchaseDetailsReportPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/cash-flow-statement" element={<ProtectedRoute><CashFlowStatementPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/balance-sheet" element={<ProtectedRoute><BalanceSheetPage /></ProtectedRoute>} />
        <Route path="/accounts-module/reports/trial-balance" element={<ProtectedRoute><TrialBalancePage /></ProtectedRoute>} />

        {/* --- Office budget module --- */}
        <Route path="/accounts-module/office-budget" element={<ProtectedRoute><OfficeBudgetPage /></ProtectedRoute>} />
        <Route path="/accounts-module/budget-categories" element={<ProtectedRoute><BudgetCategoryPage /></ProtectedRoute>} />
        <Route path="/accounts-module/office-expense-list" element={<ProtectedRoute><OfficeExpenseListPage /></ProtectedRoute>} />
        <Route path="/accounts-module/office-expense" element={<ProtectedRoute><OfficeExpensePage /></ProtectedRoute>} />
        <Route path="/accounts-module/office-expense/:id" element={<ProtectedRoute><OfficeExpensePage /></ProtectedRoute>} />
        <Route path="/accounts-module/office-report" element={<ProtectedRoute><OfficeReportPage /></ProtectedRoute>} />

        {/* --- Team members / role-based access --- */}
        <Route path="/settings/users" element={<AdminOnlyRoute><UserManagementPage /></AdminOnlyRoute>} />

        {/* --- Portal --- */}
        <Route path="/portal/login" element={<PortalPublicOnlyRoute><PortalLogin /></PortalPublicOnlyRoute>} />
        <Route path="/portal/dashboard" element={<PortalProtectedRoute><PortalDashboardRouter /></PortalProtectedRoute>} />
        <Route path="/portal/employee/leave" element={<PortalProtectedRoute><PortalLeaveRequestPage /></PortalProtectedRoute>} />
        <Route path="/portal/employee/advance" element={<PortalProtectedRoute><PortalAdvanceRequestPage /></PortalProtectedRoute>} />
        <Route path="/portal/invoices" element={<PortalProtectedRoute><PortalInvoices /></PortalProtectedRoute>} />
        <Route path="/portal/quotes" element={<PortalProtectedRoute><PortalQuotesPage /></PortalProtectedRoute>} />
        <Route path="/portal/orders" element={<PortalProtectedRoute><PortalOrdersPage /></PortalProtectedRoute>} />
        <Route path="/portal/orders/:id" element={<PortalProtectedRoute><PortalPurchaseOrderView /></PortalProtectedRoute>} />
        <Route path="/portal/requests" element={<PortalProtectedRoute><PortalRequestsPage /></PortalProtectedRoute>} />
        <Route path="/portal/material-requisitions" element={<PortalProtectedRoute><PortalMaterialRequisitionsPage /></PortalProtectedRoute>} />
        <Route path="/portal/material-requisitions/:id" element={<PortalProtectedRoute><PortalMaterialRequisitionView /></PortalProtectedRoute>} />
        <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App