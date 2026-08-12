import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectDashboard from './pages/ProjectDashboard'
import InventoryDashboard from './pages/InventoryDashboard'
import ProjectType from './pages/ProjectType'
import Project from './pages/Project'
import AgreementList from './pages/AgreementList'
import AgreementForm from './pages/AgreementForm'
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
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/project" element={<ProjectDashboard />} />
        <Route path="/dashboard/inventory" element={<InventoryDashboard />} />
        <Route path="/project-module/project-type" element={<ProjectType />} />
        <Route path="/project-module/projects" element={<Project />} />
        <Route path="/accounts-module/agreement_list" element={<AgreementList />} />
        <Route path="/accounts-module/agreement_list_add" element={<AgreementForm />} />
        <Route path="/accounts-module/agreement_list_add/:id" element={<AgreementForm />} />
        <Route path="/accounts-module/party_list" element={<PartyList />} />
        <Route path="/project-module/site" element={<Site />} />
        <Route path="/inventory-module/flat" element={<Flat />} />
        <Route path="/inventory-module/flat-sale" element={<FlatSaleList />} />
        <Route path="/inventory-module/flat-sale/add" element={<FlatSaleForm />} />
        <Route path="/inventory-module/flat-sale/add/:id" element={<FlatSaleForm />} />
        <Route path="/inventory-module/installment-report" element={<InstallmentReport />} />
        <Route path="/project-module/share-project/assign-share" element={<AssignShare />} />
        <Route path="/project-module/share-project/share-report" element={<ShareReport />} />
        <Route path="/project-module/share-project/penalty-report" element={<PenaltyReport />} />
        <Route path="/project-module/share-project/configuration" element={<ProjectShareConfiguration />} />
        <Route path="/project-module/reports/project-summary" element={<ProjectSummaryReport />} />
        <Route path="/project-module/reports/project-progress" element={<ProjectProgressReport />} />
        <Route path="/project-module/reports/project-wise-income" element={<ProjectWiseIncomeStatement />} />
        <Route path="/project-module/reports/site-wise-income" element={<SiteWiseIncomeStatement />} />
        <Route path="/project-module/reports/amount-usage" element={<AmountUsageReport />} />
        <Route path="/inventory-module/products/category" element={<CategoryPage />} />
        <Route path="/inventory-module/products/brand" element={<BrandPage />} />
        <Route path="/inventory-module/products/unit" element={<UnitPage />} />
        <Route path="/inventory-module/products/item-entry" element={<ItemPage />} />
        <Route path="/inventory-module/purchase" element={<PurchasePage />} />
        <Route path="/inventory-module/purchase/:id" element={<PurchasePage />} />
        <Route path="/inventory-module/purchase-list" element={<PurchaseList />} />
        <Route path="/procurement-module/purchase-order" element={<PurchaseOrderPage />} />
        <Route path="/procurement-module/purchase-order/:id" element={<PurchaseOrderPage />} />
        <Route path="/procurement-module/purchase-order-list" element={<PurchaseOrderList />} />
        <Route path="/requisition-module/material-requisition-list" element={<MaterialRequisitionList />} />
        <Route path="/requisition-module/material-requisition-add" element={<MaterialRequisitionPage />} />
        <Route path="/requisition-module/material-requisition-add/:id" element={<MaterialRequisitionPage />} />
        <Route path="/requisition-module/service-work-requisition-list" element={<ServiceRequisitionList />} />
        <Route path="/requisition-module/service-work-requisition-add" element={<ServiceRequisitionPage />} />
        <Route path="/requisition-module/service-work-requisition-add/:id" element={<ServiceRequisitionPage />} />
        <Route path="/inventory-module/materialusage" element={<MaterialUsagePage />} />
        <Route path="/inventory-module/materialusage/:id" element={<MaterialUsagePage />} />
        <Route path="/inventory-module/material_usage" element={<MaterialUsageList />} />
        <Route path="/inventory-module/stock_adjustment" element={<StockTransferPage />} />
        <Route path="/inventory-module/stock_adjustment/:id" element={<StockTransferPage />} />
        <Route path="/inventory-module/stock_adjustment_list" element={<StockTransferList />} />
        <Route path="/crm-module/communication_status" element={<CommunicationStatusPage />} />
        <Route path="/crm-module/lead_category" element={<LeadCategoryPage />} />
        <Route path="/crm-module/campaign" element={<CampaignPage />} />
        <Route path="/crm-module/profession" element={<ProfessionPage />} />
        <Route path="/crm-module/add-lead-source" element={<LeadSourcePage />} />
        <Route path="/crm-module/feature" element={<OfferPage />} />
        <Route path="/crm-module/area" element={<AreaPage />} />
        <Route path="/crm-module/lead_status" element={<LeadStagePage />} />
        <Route path="/crm-module/lead" element={<LeadPage />} />
        <Route path="/crm-module/call-center/follow-up" element={<FollowUp />} />
        <Route path="/accounts-module/chart-group" element={<ChartOfGroupPage />} />
        <Route path="/accounts-module/chart-group-hierarchy" element={<ChartOfGroupHierarchy />} />
        <Route path="/accounts-module/chart-accounts" element={<ChartOfAccountsPage />} />
        <Route path="/accounts-module/customer-accounts" element={<CustomerAccountsPage />} />
        <Route path="/accounts-module/supplier-accounts" element={<SupplierAccountsPage />} />
        <Route path="/accounts-module/investor-accounts" element={<InvestorAccountsPage />} />
        <Route path="/accounts-module/billing/category" element={<BillingCategoryPage />} />
        <Route path="/inventory-module/bill-item" element={<BillItemPage />} />
        <Route path="/item/service-view" element={<ServiceWorkNamePage />} />
        <Route path="/accounts-settings/title" element={<BoqTitlePage />} />
        <Route path="/accounts-module/asset_list" element={<AssetListPage />} />
        <Route path="/accounts-module/asset_list_add" element={<AssetFormPage />} />
        <Route path="/accounts-module/asset_list_add/:id" element={<AssetFormPage />} />
        <Route path="/requisition-module/fund-requisition" element={<FundRequisitionList />} />
        <Route path="/billing/bill_list" element={<BillList />} />
        <Route path="/billing/bill" element={<BillPage />} />
        <Route path="/billing/bill/:id" element={<BillPage />} />
        <Route path="/billing/vendor_bill_list" element={<ContractorBillList />} />
        <Route path="/billing/contract_bill" element={<ContractorBillPage />} />
        <Route path="/billing/contract_bill/:id" element={<ContractorBillPage />} />
        <Route path="/service/labor-worker-bill-list" element={<LabourWorkerBillList />} />
        <Route path="/service/labor-worker-bill-add" element={<LabourWorkerBillPage />} />
        <Route path="/service/labor-worker-bill-add/:id" element={<LabourWorkerBillPage />} />
        <Route path="/billing/workorder_list" element={<WorkorderList />} />
        <Route path="/billing/workorder" element={<WorkorderPage />} />
        <Route path="/billing/workorder/:id" element={<WorkorderPage />} />
        <Route path="/billing/contractor-work-order-list" element={<ContractorWorkorderList />} />
        <Route path="/billing/contractor-workorder" element={<ContractorWorkorderPage />} />
        <Route path="/billing/contractor-workorder/:id" element={<ContractorWorkorderPage />} />
        <Route path="/billing/percentage_bill_list" element={<PeriodBillList />} />
        <Route path="/billing/period-bill-add" element={<PeriodBillPage />} />
        <Route path="/billing/period-bill-add/:id" element={<PeriodBillPage />} />
        <Route path="/billing/adjustment_bill_list" element={<AdjustmentBillList />} />
        <Route path="/billing/adjustment-bill" element={<AdjustmentBillPage />} />
        <Route path="/accounts-module/expense_list" element={<ExpenseListPage />} />
        <Route path="/accounts-module/expense" element={<ExpensePage />} />
        <Route path="/accounts-module/expense/:id" element={<ExpensePage />} />
        <Route path="/accounts-module/receipt-list" element={<ReceiptVoucherPage />} />
        <Route path="/accounts-module/receipt-list/add" element={<ReceiptVoucherPage />} />
        <Route path="/billing/adjustment-bill/:id" element={<AdjustmentBillPage />} />
        <Route path="/accounts-module/reports/payable-report" element={<PayableReportPage />} />
        <Route path="/accounts-module/reports/expense-report" element={<ExpenseReportPage />} />
        <Route path="/accounts-module/reports/receivable-report" element={<ReceivableReportPage />} />
        <Route path="/accounts-module/reports/day-book" element={<DayBookPage />} />
        <Route path="/accounts-module/reports/receive-payment-statement" element={<ReceivePaymentStatementPage />} />
        <Route path="/accounts-module/bank-reconciliation" element={<BankReconciliationPage />} />
        <Route path="/requisition-module/reports/fund-requisition" element={<FundRequisitionReportPage />} />
        <Route path="/billing/item_sale_list" element={<SaleList />} />
        <Route path="/billing/item-sale-create" element={<SalePage />} />
        <Route path="/billing/item-sale-create/:id" element={<SalePage />} />
        <Route path="/billing/quote-list" element={<QuoteList />} />
        <Route path="/billing/quote" element={<QuotePage />} />
        <Route path="/billing/quote/:id" element={<QuotePage />} />
        <Route path="/accounts-module/payment-list" element={<PaymentVoucherPage />} />
        <Route path="/accounts-module/payment-list/add" element={<PaymentVoucherPage />} />
        <Route path="/billing/contractor_bill_report" element={<ContractorBillReportPage />} />
        <Route path="/accounts-module/journal_list" element={<JournalVoucherListPage />} />
        <Route path="/accounts-module/journal_list_add" element={<JournalVoucherPage />} />
        <Route path="/accounts-module/contra_list" element={<ContraVoucherListPage />} />
        <Route path="/accounts-module/contra_list_add" element={<ContraVoucherPage />} />
        <Route path="/accounts-module/contra_list_add/:id" element={<ContraVoucherPage />} />
        <Route path="/accounts-module/journal_list_add/:id" element={<JournalVoucherPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App