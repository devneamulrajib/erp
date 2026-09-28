const AdjustmentBill = require('./AdjustmentBill');
const AdjustmentBillItem = require('./AdjustmentBillItem');
const AdjustmentBillPayment = require('./AdjustmentBillPayment');

const Customer = require('./Customer');
const CustomerNominee = require('./CustomerNominee');

const ChartOfAccount = require('./ChartOfAccount');

const Expense = require('./Expense');
const ExpenseApproval = require('./ExpenseApproval');

const Voucher = require('./Voucher');
const VoucherEntry = require('./VoucherEntry');
const VoucherApproval = require('./VoucherApproval');

const ChartOfGroup = require('./ChartOfGroup');

const Campaign = require('./Campaign');
const LeadSource = require('./LeadSource');

const BoqTitle = require('./BoqTitle');
const ProjectType = require('./ProjectType');

const Item = require('./Item');
const Category = require('./Category');
const Brand = require('./Brand');
const Unit = require('./Unit');

const Party = require('./Party');

const User = require('./User');

const BankAccount = require('./BankAccount');

const Property = require('./Property');
const Comment = require('./Comment');
const CommentAttachment = require('./CommentAttachment');

const Project = require('./Project');
const Site = require('./Site');

const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const SalePayment = require('./SalePayment');
const SaleApproval = require('./SaleApproval');

const Purchase = require('./Purchase');
const PurchaseItem = require('./PurchaseItem');
const PurchasePayment = require('./PurchasePayment');
const PurchaseApproval = require('./PurchaseApproval');

const MaterialUsage = require('./MaterialUsage');
const MaterialUsageItem = require('./MaterialUsageItem');
const MaterialUsageApproval = require('./MaterialUsageApproval');

const Asset = require('./Asset');
const AssetDepreciationEntry = require('./AssetDepreciationEntry');
const AssetMovementEntry = require('./AssetMovementEntry');
const AssetRevaluationEntry = require('./AssetRevaluationEntry');

const Bill = require('./Bill');
const BillLineItem = require('./BillLineItem');
const BillPayment = require('./BillPayment');
const BillApproval = require('./BillApproval');

const BillItem = require('./BillItem');

const CommunicationStatus = require('./CommunicationStatus');

const ContractorBill = require('./ContractorBill');
const ContractorBillItem = require('./ContractorBillItem');
const ContractorBillPayment = require('./ContractorBillPayment');
const ContractorBillApproval = require('./ContractorBillApproval');

const ContractorWorkorder = require('./ContractorWorkorder');
const ContractorWorkorderItem = require('./ContractorWorkorderItem');

const ContraVoucher = require('./ContraVoucher');
const ContraVoucherLine = require('./ContraVoucherLine');
const ContraVoucherApproval = require('./ContraVoucherApproval');

const Flat = require('./Flat');

const FlatSale = require('./FlatSale');
const FlatSaleInstallment = require('./FlatSaleInstallment');
const FlatSaleInstallmentPayment = require('./FlatSaleInstallmentPayment');

const Area = require('./Area');
const LeadCategory = require('./LeadCategory');

const Workorder = require('./Workorder');
const WorkorderItem = require('./WorkorderItem');

const FundRequisition = require('./FundRequisition');
const FundRequisitionPayment = require('./FundRequisitionPayment');
const FundRequisitionApproval = require('./FundRequisitionApproval');

const JournalVoucher = require('./JournalVoucher');
const JournalVoucherLine = require('./JournalVoucherLine');
const JournalVoucherApproval = require('./JournalVoucherApproval');

const LabourBill = require('./LabourBill');
const LabourBillItem = require('./LabourBillItem');
const LabourBillApproval = require('./LabourBillApproval');

const Lead = require('./Lead');
const LeadRequirement = require('./LeadRequirement');
const LeadDealNegotiation = require('./LeadDealNegotiation');
const LeadFollowUp = require('./LeadFollowUp');
const LeadVisit = require('./LeadVisit');
const LeadNote = require('./LeadNote');
const LeadActivityLog = require('./LeadActivityLog');

const ServiceItem = require('./ServiceItem');
const Offer = require('./Offer');

const ServiceRequisition = require('./ServiceRequisition');
const ServiceRequisitionItem = require('./ServiceRequisitionItem');
const ServiceRequisitionApproval = require('./ServiceRequisitionApproval');

const MaterialRequisition = require('./MaterialRequisition');
const MaterialRequisitionItem = require('./MaterialRequisitionItem');
const MaterialRequisitionApproval = require('./MaterialRequisitionApproval');

const Quote = require('./Quote');
const QuoteItem = require('./QuoteItem');

const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const PurchaseOrderBoqItem = require('./PurchaseOrderBoqItem');
const PurchaseOrderApproval = require('./PurchaseOrderApproval');

const StockTransfer = require('./StockTransfer');
const StockTransferItem = require('./StockTransferItem');

const PeriodBill = require('./PeriodBill');

const PartyContact = require('./PartyContact');

const Agreement = require('./Agreement');
const AgreementParty = require('./AgreementParty');
const AgreementPayment = require('./AgreementPayment');

const PaymentVoucher = require('./PaymentVoucher');
const PaymentVoucherApproval = require('./PaymentVoucherApproval');

const ReceiptVoucher = require('./ReceiptVoucher');
const ReceiptVoucherApproval = require('./ReceiptVoucherApproval');

const AssignShare = require('./AssignShare');

// Portal (customer/supplier/vendor)
const PortalRequest = require('./PortalRequest');
const MaterialRequisitionQuotation = require('./MaterialRequisitionQuotation');
const MaterialRequisitionQuotationItem = require('./MaterialRequisitionQuotationItem');
const Notification = require('./Notification');

const BudgetCategory = require('./BudgetCategory');
const MonthlyBudget = require('./MonthlyBudget');
const OfficeExpense = require('./OfficeExpense');

const Employee = require('./Employee');
const EmployeeAdvance = require('./EmployeeAdvance');
const LeaveRequest = require('./LeaveRequest');
const Attendance = require('./Attendance');


// Add relations:
Employee.hasMany(EmployeeAdvance, { as: 'advances', foreignKey: 'employeeId', onDelete: 'CASCADE' });
EmployeeAdvance.belongsTo(Employee, { as: 'employee', foreignKey: 'employeeId' });

OfficeExpense.hasOne(EmployeeAdvance, { foreignKey: 'officeExpenseId' });
EmployeeAdvance.belongsTo(OfficeExpense, { as: 'officeExpense', foreignKey: 'officeExpenseId' });

// ---- LeaveRequest / Attendance (Employee Portal) ----
Employee.hasMany(LeaveRequest, { as: 'leaveRequests', foreignKey: 'employeeId', onDelete: 'CASCADE' });
LeaveRequest.belongsTo(Employee, { as: 'employee', foreignKey: 'employeeId' });

Employee.hasMany(Attendance, { as: 'attendanceRecords', foreignKey: 'employeeId', onDelete: 'CASCADE' });
Attendance.belongsTo(Employee, { as: 'employee', foreignKey: 'employeeId' });

// ---- AssignShare ----
Project.hasMany(AssignShare, { foreignKey: 'projectId' });
AssignShare.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

ProjectType.hasMany(AssignShare, { foreignKey: 'projectTypeId' });
AssignShare.belongsTo(ProjectType, { as: 'projectType', foreignKey: 'projectTypeId' });

Site.hasMany(AssignShare, { foreignKey: 'siteId' });
AssignShare.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Flat.hasMany(AssignShare, { foreignKey: 'flatId' });
AssignShare.belongsTo(Flat, { as: 'flat', foreignKey: 'flatId' });

ChartOfAccount.hasMany(AssignShare, { foreignKey: 'customerId' });
AssignShare.belongsTo(ChartOfAccount, { as: 'customer', foreignKey: 'customerId' });

// ---- PartyContact (Agreement party list) ----
Agreement.hasMany(PartyContact, { as: 'partyContacts', foreignKey: 'agreementId' });
PartyContact.belongsTo(Agreement, { as: 'agreement', foreignKey: 'agreementId' });

// ---- ContractorWorkorder ----
ContractorWorkorder.hasMany(ContractorWorkorderItem, { foreignKey: 'contractorWorkorderId', onDelete: 'CASCADE' });
ContractorWorkorderItem.belongsTo(ContractorWorkorder, { foreignKey: 'contractorWorkorderId' });

// ---- Agreement ----
Agreement.hasMany(AgreementParty, { as: 'parties', foreignKey: 'agreementId', onDelete: 'CASCADE' });
AgreementParty.belongsTo(Agreement, { foreignKey: 'agreementId' });

Agreement.hasMany(AgreementPayment, { as: 'payments', foreignKey: 'agreementId', onDelete: 'CASCADE' });
AgreementPayment.belongsTo(Agreement, { foreignKey: 'agreementId' });

Party.hasMany(ContractorWorkorder, { as: 'workorders', foreignKey: 'supplierId' });
ContractorWorkorder.belongsTo(Party, { as: 'supplier', foreignKey: 'supplierId' });

Project.hasMany(ContractorWorkorder, { as: 'contractorWorkorders', foreignKey: 'projectId' });
ContractorWorkorder.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(ContractorWorkorder, { foreignKey: 'siteId' });
ContractorWorkorder.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Category.hasMany(ContractorWorkorder, { foreignKey: 'categoryId' });
ContractorWorkorder.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

// ---- ContraVoucher ----
ContraVoucher.hasMany(ContraVoucherLine, { foreignKey: 'contraVoucherId', onDelete: 'CASCADE' });
ContraVoucherLine.belongsTo(ContraVoucher, { foreignKey: 'contraVoucherId' });

ContraVoucher.hasMany(ContraVoucherApproval, { foreignKey: 'contraVoucherId', onDelete: 'CASCADE' });
ContraVoucherApproval.belongsTo(ContraVoucher, { foreignKey: 'contraVoucherId' });

// ---- Flat ----
Project.hasMany(Flat, { foreignKey: 'projectId' });
Flat.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(Flat, { foreignKey: 'siteId' });
Flat.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

// ---- FlatSale ----
FlatSale.hasMany(FlatSaleInstallment, { foreignKey: 'flatSaleId', onDelete: 'CASCADE' });
FlatSaleInstallment.belongsTo(FlatSale, { foreignKey: 'flatSaleId' });

FlatSaleInstallment.hasMany(FlatSaleInstallmentPayment, { foreignKey: 'installmentId', onDelete: 'CASCADE' });
FlatSaleInstallmentPayment.belongsTo(FlatSaleInstallment, { foreignKey: 'installmentId' });

Project.hasMany(FlatSale, { foreignKey: 'projectId' });
FlatSale.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(FlatSale, { foreignKey: 'siteId' });
FlatSale.belongsTo(Site, { foreignKey: 'siteId' });

Flat.hasMany(FlatSale, { foreignKey: 'flatId' });
FlatSale.belongsTo(Flat, { foreignKey: 'flatId' });

ChartOfAccount.hasMany(FlatSale, { foreignKey: 'customerId' });
FlatSale.belongsTo(ChartOfAccount, { foreignKey: 'customerId' });

// ---- MaterialUsage ----
MaterialUsage.hasMany(MaterialUsageItem, { foreignKey: 'materialUsageId', onDelete: 'CASCADE' });
MaterialUsageItem.belongsTo(MaterialUsage, { foreignKey: 'materialUsageId' });

MaterialUsage.hasMany(MaterialUsageApproval, { foreignKey: 'materialUsageId', onDelete: 'CASCADE' });
MaterialUsageApproval.belongsTo(MaterialUsage, { foreignKey: 'materialUsageId' });

Project.hasMany(MaterialUsage, { foreignKey: 'projectId' });
MaterialUsage.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(MaterialUsage, { foreignKey: 'siteId' });
MaterialUsage.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(MaterialUsage, { foreignKey: 'categoryId' });
MaterialUsage.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- AdjustmentBill ----
AdjustmentBill.hasMany(AdjustmentBillItem, { foreignKey: 'adjustmentBillId', onDelete: 'CASCADE' });
AdjustmentBillItem.belongsTo(AdjustmentBill, { foreignKey: 'adjustmentBillId' });

AdjustmentBill.hasMany(AdjustmentBillPayment, { foreignKey: 'adjustmentBillId', onDelete: 'CASCADE' });
AdjustmentBillPayment.belongsTo(AdjustmentBill, { foreignKey: 'adjustmentBillId' });

// ---- Customer (legacy/internal model — kept only for CustomerNominee) ----
Customer.hasMany(CustomerNominee, { foreignKey: 'customerId', onDelete: 'CASCADE' });
CustomerNominee.belongsTo(Customer, { foreignKey: 'customerId' });

// ---- Expense ----
Expense.hasMany(ExpenseApproval, { foreignKey: 'expenseId', onDelete: 'CASCADE' });
ExpenseApproval.belongsTo(Expense, { foreignKey: 'expenseId' });

Voucher.hasOne(Expense, { foreignKey: 'voucherId' });
Expense.belongsTo(Voucher, { foreignKey: 'voucherId' });

// ---- Voucher ----
Voucher.hasMany(VoucherEntry, { foreignKey: 'voucherId', onDelete: 'CASCADE' });
VoucherEntry.belongsTo(Voucher, { foreignKey: 'voucherId' });

Voucher.hasMany(VoucherApproval, { foreignKey: 'voucherId', onDelete: 'CASCADE' });
VoucherApproval.belongsTo(Voucher, { foreignKey: 'voucherId' });

// ---- ChartOfGroup (self-referential) ----
ChartOfGroup.belongsTo(ChartOfGroup, { as: 'Under', foreignKey: 'underId' });
ChartOfGroup.hasMany(ChartOfGroup, { as: 'Children', foreignKey: 'underId' });

// ---- ChartOfGroup <-> ChartOfAccount ----
ChartOfGroup.hasMany(ChartOfAccount, { as: 'accounts', foreignKey: 'chartOfGroupId' });
ChartOfAccount.belongsTo(ChartOfGroup, { as: 'chartOfGroup', foreignKey: 'chartOfGroupId' });

// ---- Campaign <-> LeadSource ----
Campaign.belongsTo(LeadSource, { foreignKey: 'leadSourceId' });
LeadSource.hasMany(Campaign, { foreignKey: 'leadSourceId' });

// ---- BoqTitle <-> ProjectType ----
BoqTitle.belongsTo(ProjectType, { foreignKey: 'projectTypeId' });
ProjectType.hasMany(BoqTitle, { foreignKey: 'projectTypeId' });

// ---- Item <-> Category / Brand ----
Category.hasMany(Item, { foreignKey: 'categoryId' });
Item.belongsTo(Category, { foreignKey: 'categoryId' });

Brand.hasMany(Item, { foreignKey: 'brandId' });
Item.belongsTo(Brand, { foreignKey: 'brandId' });

// ---- Party ----
ChartOfGroup.hasMany(Party, { foreignKey: 'chartGroupId' });
Party.belongsTo(ChartOfGroup, { foreignKey: 'chartGroupId' });

// ---- Comment ----
Comment.hasMany(CommentAttachment, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentAttachment.belongsTo(Comment, { foreignKey: 'commentId' });

// ---- Sale ----
Sale.hasMany(SaleItem, { foreignKey: 'saleId', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

Sale.hasMany(SalePayment, { foreignKey: 'saleId', onDelete: 'CASCADE' });
SalePayment.belongsTo(Sale, { foreignKey: 'saleId' });

Sale.hasMany(SaleApproval, { foreignKey: 'saleId', onDelete: 'CASCADE' });
SaleApproval.belongsTo(Sale, { foreignKey: 'saleId' });

ChartOfAccount.hasMany(Sale, { foreignKey: 'customerId' });
Sale.belongsTo(ChartOfAccount, { foreignKey: 'customerId' });

Project.hasMany(Sale, { foreignKey: 'projectId' });
Sale.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Sale, { foreignKey: 'siteId' });
Sale.belongsTo(Site, { foreignKey: 'siteId' });

// ---- Purchase ----
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId' });

Purchase.hasMany(PurchasePayment, { foreignKey: 'purchaseId', onDelete: 'CASCADE' });
PurchasePayment.belongsTo(Purchase, { foreignKey: 'purchaseId' });

Purchase.hasMany(PurchaseApproval, { foreignKey: 'purchaseId', onDelete: 'CASCADE' });
PurchaseApproval.belongsTo(Purchase, { foreignKey: 'purchaseId' });

ChartOfAccount.hasMany(Purchase, { foreignKey: 'supplierId' });
Purchase.belongsTo(ChartOfAccount, { foreignKey: 'supplierId' });

Project.hasMany(Purchase, { foreignKey: 'projectId' });
Purchase.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Purchase, { foreignKey: 'siteId' });
Purchase.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(Purchase, { foreignKey: 'categoryId' });
Purchase.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- Asset ----
Asset.hasMany(AssetDepreciationEntry, { as: 'depreciationEntries', foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetDepreciationEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Asset.hasMany(AssetMovementEntry, { as: 'movementEntries', foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetMovementEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Asset.hasMany(AssetRevaluationEntry, { as: 'revaluationEntries', foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetRevaluationEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Item.hasMany(Asset, { foreignKey: 'itemId' });
Asset.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

Project.hasMany(Asset, { foreignKey: 'projectId' });
Asset.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

ChartOfAccount.hasMany(Asset, { foreignKey: 'expenseAccountId' });
Asset.belongsTo(ChartOfAccount, { as: 'expenseAccount', foreignKey: 'expenseAccountId' });

// ---- Bill ----
Bill.hasMany(BillLineItem, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillLineItem.belongsTo(Bill, { foreignKey: 'billId' });

Bill.hasMany(BillPayment, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillPayment.belongsTo(Bill, { foreignKey: 'billId' });

Bill.hasMany(BillApproval, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillApproval.belongsTo(Bill, { foreignKey: 'billId' });

ChartOfAccount.hasMany(Bill, { foreignKey: 'customerId' });
Bill.belongsTo(ChartOfAccount, { foreignKey: 'customerId' });

ChartOfAccount.hasMany(Bill, { as: 'ledgerBills', foreignKey: 'ledgerId' });
Bill.belongsTo(ChartOfAccount, { as: 'ledger', foreignKey: 'ledgerId' });

Project.hasMany(Bill, { foreignKey: 'projectId' });
Bill.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Bill, { foreignKey: 'siteId' });
Bill.belongsTo(Site, { foreignKey: 'siteId' });

// ---- BillItem (catalog) ----
Category.hasMany(BillItem, { as: 'billItems', foreignKey: 'categoryId' });
BillItem.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Brand.hasMany(BillItem, { as: 'billItems', foreignKey: 'brandId' });
BillItem.belongsTo(Brand, { as: 'brand', foreignKey: 'brandId' });

Unit.hasMany(BillItem, { as: 'billItems', foreignKey: 'unitId' });
BillItem.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

// ---- ContractorBill ----
ContractorBill.hasMany(ContractorBillItem, { foreignKey: 'contractorBillId', onDelete: 'CASCADE' });
ContractorBillItem.belongsTo(ContractorBill, { foreignKey: 'contractorBillId' });

ContractorBill.hasMany(ContractorBillPayment, { foreignKey: 'contractorBillId', onDelete: 'CASCADE' });
ContractorBillPayment.belongsTo(ContractorBill, { foreignKey: 'contractorBillId' });

ContractorBill.hasMany(ContractorBillApproval, { foreignKey: 'contractorBillId', onDelete: 'CASCADE' });
ContractorBillApproval.belongsTo(ContractorBill, { foreignKey: 'contractorBillId' });

Party.hasMany(ContractorBill, { foreignKey: 'partyId' });
ContractorBill.belongsTo(Party, { foreignKey: 'partyId' });

ChartOfAccount.hasMany(ContractorBill, { foreignKey: 'ledgerId' });
ContractorBill.belongsTo(ChartOfAccount, { foreignKey: 'ledgerId' });

Project.hasMany(ContractorBill, { foreignKey: 'projectId' });
ContractorBill.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(ContractorBill, { foreignKey: 'siteId' });
ContractorBill.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(ContractorBill, { foreignKey: 'categoryId' });
ContractorBill.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- Workorder ----
Workorder.hasMany(WorkorderItem, { as: 'items', foreignKey: 'workorderId', onDelete: 'CASCADE' });
WorkorderItem.belongsTo(Workorder, { foreignKey: 'workorderId' });

ChartOfAccount.hasMany(Workorder, { foreignKey: 'customerId' });
Workorder.belongsTo(ChartOfAccount, { as: 'customer', foreignKey: 'customerId' });

Project.hasMany(Workorder, { foreignKey: 'projectId' });
Workorder.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(Workorder, { foreignKey: 'siteId' });
Workorder.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

// ---- FundRequisition ----
FundRequisition.hasMany(FundRequisitionPayment, { as: 'payments', foreignKey: 'fundRequisitionId', onDelete: 'CASCADE' });
FundRequisitionPayment.belongsTo(FundRequisition, { foreignKey: 'fundRequisitionId' });

FundRequisition.hasMany(FundRequisitionApproval, { as: 'approvals', foreignKey: 'fundRequisitionId', onDelete: 'CASCADE' });
FundRequisitionApproval.belongsTo(FundRequisition, { foreignKey: 'fundRequisitionId' });

Project.hasMany(FundRequisition, { foreignKey: 'projectId' });
FundRequisition.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(FundRequisition, { foreignKey: 'siteId' });
FundRequisition.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

User.hasMany(FundRequisition, { foreignKey: 'fromUserId' });
FundRequisition.belongsTo(User, { foreignKey: 'fromUserId', as: 'from' });

// ---- JournalVoucher ----
JournalVoucher.hasMany(JournalVoucherLine, { foreignKey: 'journalVoucherId', onDelete: 'CASCADE' });
JournalVoucherLine.belongsTo(JournalVoucher, { foreignKey: 'journalVoucherId' });

JournalVoucher.hasMany(JournalVoucherApproval, { foreignKey: 'journalVoucherId', onDelete: 'CASCADE' });
JournalVoucherApproval.belongsTo(JournalVoucher, { foreignKey: 'journalVoucherId' });

// ---- LabourBill ----
LabourBill.hasMany(LabourBillItem, { foreignKey: 'labourBillId', onDelete: 'CASCADE' });
LabourBillItem.belongsTo(LabourBill, { foreignKey: 'labourBillId' });

LabourBill.hasMany(LabourBillApproval, { foreignKey: 'labourBillId', onDelete: 'CASCADE' });
LabourBillApproval.belongsTo(LabourBill, { foreignKey: 'labourBillId' });

Party.hasMany(LabourBill, { as: 'labourBills', foreignKey: 'partyId' });
LabourBill.belongsTo(Party, { as: 'party', foreignKey: 'partyId' });

ChartOfAccount.hasMany(LabourBill, { as: 'labourBills', foreignKey: 'ledgerId' });
LabourBill.belongsTo(ChartOfAccount, { as: 'ledger', foreignKey: 'ledgerId' });

Project.hasMany(LabourBill, { as: 'labourBills', foreignKey: 'projectId' });
LabourBill.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(LabourBill, { foreignKey: 'siteId' });
LabourBill.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(LabourBill, { foreignKey: 'categoryId' });
LabourBill.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- Lead ----
Lead.hasMany(LeadRequirement, { as: 'requirements', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadRequirement.belongsTo(Lead, { foreignKey: 'leadId' });
Area.hasMany(LeadRequirement, { foreignKey: 'areaId' });
LeadRequirement.belongsTo(Area, { foreignKey: 'areaId' });

Lead.hasMany(LeadDealNegotiation, { as: 'dealNegotiations', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadDealNegotiation.belongsTo(Lead, { foreignKey: 'leadId' });
Flat.hasMany(LeadDealNegotiation, { foreignKey: 'flatId' });
LeadDealNegotiation.belongsTo(Flat, { foreignKey: 'flatId' });

Lead.hasMany(LeadFollowUp, { as: 'followUps', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadFollowUp.belongsTo(Lead, { foreignKey: 'leadId' });

Lead.hasMany(LeadVisit, { as: 'visits', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadVisit.belongsTo(Lead, { foreignKey: 'leadId' });

Lead.hasMany(LeadNote, { as: 'notes', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadNote.belongsTo(Lead, { foreignKey: 'leadId' });

Lead.hasMany(LeadActivityLog, { as: 'activityLog', foreignKey: 'leadId', onDelete: 'CASCADE' });
LeadActivityLog.belongsTo(Lead, { foreignKey: 'leadId' });

Lead.belongsToMany(Flat, { through: 'leadassignedflats', as: 'assignedFlats', foreignKey: 'leadId' });
Flat.belongsToMany(Lead, { through: 'leadassignedflats', as: 'leads', foreignKey: 'flatId' });

LeadSource.hasMany(Lead, { foreignKey: 'leadSourceId' });
Lead.belongsTo(LeadSource, { foreignKey: 'leadSourceId' });

Project.hasMany(Lead, { foreignKey: 'interestedProjectId' });
Lead.belongsTo(Project, { foreignKey: 'interestedProjectId', as: 'interestedProject' });

LeadCategory.hasMany(Lead, { foreignKey: 'leadCategoryId' });
Lead.belongsTo(LeadCategory, { foreignKey: 'leadCategoryId', as: 'leadCategory' });

Campaign.hasMany(Lead, { foreignKey: 'campaignId' });
Lead.belongsTo(Campaign, { foreignKey: 'campaignId' });

ChartOfAccount.hasMany(Lead, { foreignKey: 'convertedCustomerId' });
Lead.belongsTo(ChartOfAccount, { foreignKey: 'convertedCustomerId' });

// ---- ServiceItem ----
Category.hasMany(ServiceItem, { foreignKey: 'categoryId' });
ServiceItem.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Unit.hasMany(ServiceItem, { foreignKey: 'unitId' });
ServiceItem.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

// ---- ServiceRequisition ----
ServiceRequisition.hasMany(ServiceRequisitionItem, { as: 'items', foreignKey: 'serviceRequisitionId', onDelete: 'CASCADE' });
ServiceRequisitionItem.belongsTo(ServiceRequisition, { foreignKey: 'serviceRequisitionId' });
ServiceItem.hasMany(ServiceRequisitionItem, { foreignKey: 'serviceItemId' });
ServiceRequisitionItem.belongsTo(ServiceItem, { as: 'serviceItem', foreignKey: 'serviceItemId' });

ServiceRequisition.hasMany(ServiceRequisitionApproval, { as: 'approvals', foreignKey: 'serviceRequisitionId', onDelete: 'CASCADE' });
ServiceRequisitionApproval.belongsTo(ServiceRequisition, { foreignKey: 'serviceRequisitionId' });

Project.hasMany(ServiceRequisition, { foreignKey: 'projectId' });
ServiceRequisition.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(ServiceRequisition, { foreignKey: 'siteId' });
ServiceRequisition.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

// ServiceRequisition <-> ChartOfAccount (as supplier) — supports the portal
ChartOfAccount.hasMany(ServiceRequisition, { foreignKey: 'supplierId' });
ServiceRequisition.belongsTo(ChartOfAccount, { as: 'supplier', foreignKey: 'supplierId' });

// ---- MaterialRequisition ----
MaterialRequisition.hasMany(MaterialRequisitionItem, { as: 'items', foreignKey: 'materialRequisitionId', onDelete: 'CASCADE' });
MaterialRequisitionItem.belongsTo(MaterialRequisition, { foreignKey: 'materialRequisitionId' });
Item.hasMany(MaterialRequisitionItem, { foreignKey: 'itemId' });
MaterialRequisitionItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

MaterialRequisition.hasMany(MaterialRequisitionApproval, { as: 'approvals', foreignKey: 'materialRequisitionId', onDelete: 'CASCADE' });
MaterialRequisitionApproval.belongsTo(MaterialRequisition, { foreignKey: 'materialRequisitionId' });

ChartOfAccount.hasMany(MaterialRequisition, { foreignKey: 'supplierId' });
MaterialRequisition.belongsTo(ChartOfAccount, { as: 'supplier', foreignKey: 'supplierId' });

Project.hasMany(MaterialRequisition, { foreignKey: 'projectId' });
MaterialRequisition.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(MaterialRequisition, { foreignKey: 'siteId' });
MaterialRequisition.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Category.hasMany(MaterialRequisition, { foreignKey: 'categoryId' });
MaterialRequisition.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Purchase.hasMany(MaterialRequisition, { foreignKey: 'convertedToPurchaseId' });
MaterialRequisition.belongsTo(Purchase, { as: 'convertedToPurchase', foreignKey: 'convertedToPurchaseId' });

PurchaseOrder.hasMany(MaterialRequisition, { foreignKey: 'convertedToPurchaseOrderId' });
MaterialRequisition.belongsTo(PurchaseOrder, { as: 'convertedToPurchaseOrder', foreignKey: 'convertedToPurchaseOrderId' });

// ---- MaterialRequisitionQuotation ----
MaterialRequisition.hasMany(MaterialRequisitionQuotation, { as: 'quotations', foreignKey: 'materialRequisitionId', onDelete: 'CASCADE' });
MaterialRequisitionQuotation.belongsTo(MaterialRequisition, { foreignKey: 'materialRequisitionId' });

ChartOfAccount.hasMany(MaterialRequisitionQuotation, { foreignKey: 'supplierId' });
MaterialRequisitionQuotation.belongsTo(ChartOfAccount, { as: 'supplier', foreignKey: 'supplierId' });

MaterialRequisitionQuotation.hasMany(MaterialRequisitionQuotationItem, { as: 'items', foreignKey: 'materialRequisitionQuotationId', onDelete: 'CASCADE' });
MaterialRequisitionQuotationItem.belongsTo(MaterialRequisitionQuotation, { foreignKey: 'materialRequisitionQuotationId' });

// ---- Quote ----
Quote.hasMany(QuoteItem, { as: 'items', foreignKey: 'quoteId', onDelete: 'CASCADE' });
QuoteItem.belongsTo(Quote, { foreignKey: 'quoteId' });

ChartOfAccount.hasMany(Quote, { foreignKey: 'customerId' });
Quote.belongsTo(ChartOfAccount, { as: 'customer', foreignKey: 'customerId' });

Project.hasMany(Quote, { foreignKey: 'projectId' });
Quote.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(Quote, { foreignKey: 'siteId' });
Quote.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

// ---- PurchaseOrder ----
PurchaseOrder.hasMany(PurchaseOrderItem, { as: 'items', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
Item.hasMany(PurchaseOrderItem, { foreignKey: 'itemId' });
PurchaseOrderItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

PurchaseOrder.hasMany(PurchaseOrderBoqItem, { as: 'boqItems', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderBoqItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });

PurchaseOrder.hasMany(PurchaseOrderApproval, { as: 'approvals', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderApproval.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });

ChartOfAccount.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(ChartOfAccount, { as: 'supplier', foreignKey: 'supplierId' });

Project.hasMany(PurchaseOrder, { foreignKey: 'projectId' });
PurchaseOrder.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(PurchaseOrder, { foreignKey: 'siteId' });
PurchaseOrder.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Category.hasMany(PurchaseOrder, { foreignKey: 'categoryId' });
PurchaseOrder.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

// PurchaseOrder -> Bill: the supplier invoice/bill auto-generated once admin
// confirms delivery (see server/routes/purchaseOrder.js -> generateBillFromOrder).
// constraints: false because convertedToBillId is a plain column added via the
// migration script, not a real DB foreign key.
PurchaseOrder.belongsTo(Bill, { as: 'bill', foreignKey: 'convertedToBillId', constraints: false });

// ---- StockTransfer ----
StockTransfer.hasMany(StockTransferItem, { as: 'items', foreignKey: 'stockTransferId', onDelete: 'CASCADE' });
StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'stockTransferId' });
Item.hasMany(StockTransferItem, { foreignKey: 'itemId' });
StockTransferItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

Project.hasMany(StockTransfer, { as: 'fromProjectTransfers', foreignKey: 'fromProjectId' });
StockTransfer.belongsTo(Project, { as: 'fromProject', foreignKey: 'fromProjectId' });
Project.hasMany(StockTransfer, { as: 'toProjectTransfers', foreignKey: 'toProjectId' });
StockTransfer.belongsTo(Project, { as: 'toProject', foreignKey: 'toProjectId' });

Site.hasMany(StockTransfer, { as: 'fromSiteTransfers', foreignKey: 'fromSiteId' });
StockTransfer.belongsTo(Site, { as: 'fromSite', foreignKey: 'fromSiteId' });
Site.hasMany(StockTransfer, { as: 'toSiteTransfers', foreignKey: 'toSiteId' });
StockTransfer.belongsTo(Site, { as: 'toSite', foreignKey: 'toSiteId' });

Category.hasMany(StockTransfer, { foreignKey: 'categoryId' });
StockTransfer.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

// ---- PeriodBill ----
ChartOfAccount.hasMany(PeriodBill, { foreignKey: 'customerId' });
PeriodBill.belongsTo(ChartOfAccount, { as: 'customer', foreignKey: 'customerId' });

ChartOfAccount.hasMany(PeriodBill, { as: 'ledgerPeriodBills', foreignKey: 'ledgerId' });
PeriodBill.belongsTo(ChartOfAccount, { as: 'ledger', foreignKey: 'ledgerId' });

Site.hasMany(PeriodBill, { foreignKey: 'siteId' });
PeriodBill.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Project.hasMany(PeriodBill, { foreignKey: 'projectId' });
PeriodBill.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

// ---- PaymentVoucher ----
PaymentVoucher.hasMany(PaymentVoucherApproval, { as: 'approvals', foreignKey: 'paymentVoucherId', onDelete: 'CASCADE' });
PaymentVoucherApproval.belongsTo(PaymentVoucher, { foreignKey: 'paymentVoucherId' });

// ---- ReceiptVoucher ----
ReceiptVoucher.hasMany(ReceiptVoucherApproval, { as: 'approvals', foreignKey: 'receiptVoucherId', onDelete: 'CASCADE' });
ReceiptVoucherApproval.belongsTo(ReceiptVoucher, { foreignKey: 'receiptVoucherId' });

// ---- Voucher (dashboard needs project/contact/bank names) ----
Project.hasMany(Voucher, { foreignKey: 'projectId' });
Voucher.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Party.hasMany(Voucher, { foreignKey: 'contactId' });
Voucher.belongsTo(Party, { as: 'contact', foreignKey: 'contactId' });

BankAccount.hasMany(Voucher, { foreignKey: 'bankId' });
Voucher.belongsTo(BankAccount, { as: 'bank', foreignKey: 'bankId' });

// ---- Office Budget module ----
BudgetCategory.hasMany(MonthlyBudget, { as: 'monthlyBudgets', foreignKey: 'budgetCategoryId', onDelete: 'CASCADE' });
MonthlyBudget.belongsTo(BudgetCategory, { as: 'budgetCategory', foreignKey: 'budgetCategoryId' });

// NOTE: kept for backward compatibility with any already-recorded general
// Expense rows that used budgetCategoryId — but the ExpensePage UI no
// longer writes to it, and it is NOT summed into office budget totals.
BudgetCategory.hasMany(Expense, { foreignKey: 'budgetCategoryId' });
Expense.belongsTo(BudgetCategory, { as: 'budgetCategory', foreignKey: 'budgetCategoryId' });

// This is the real source of office budget spend.
BudgetCategory.hasMany(OfficeExpense, { as: 'officeExpenses', foreignKey: 'budgetCategoryId' });
OfficeExpense.belongsTo(BudgetCategory, { as: 'budgetCategory', foreignKey: 'budgetCategoryId' });

Voucher.hasOne(OfficeExpense, { foreignKey: 'voucherId' });
OfficeExpense.belongsTo(Voucher, { foreignKey: 'voucherId' });

// Self-referential: top-level category <-> its subcategories
BudgetCategory.belongsTo(BudgetCategory, { as: 'parent', foreignKey: 'parentId' });
BudgetCategory.hasMany(BudgetCategory, { as: 'subcategories', foreignKey: 'parentId' });

// ---- PortalRequest ----
ChartOfAccount.hasMany(PortalRequest, { as: 'portalRequests', foreignKey: 'customerId', onDelete: 'CASCADE' });
PortalRequest.belongsTo(ChartOfAccount, { as: 'customer', foreignKey: 'customerId' });

module.exports = {
  AdjustmentBill,
  AdjustmentBillItem,
  AdjustmentBillPayment,
  Customer,
  CustomerNominee,
  ChartOfAccount,
  Expense,
  ExpenseApproval,
  Voucher,
  VoucherEntry,
  VoucherApproval,
  ChartOfGroup,
  Campaign,
  LeadSource,
  BoqTitle,
  ProjectType,
  Item,
  Category,
  Brand,
  Unit,
  Party,
  User,
  BankAccount,
  Property,
  Comment,
  CommentAttachment,
  Project,
  Site,
  Sale,
  SaleItem,
  SalePayment,
  SaleApproval,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  PurchaseApproval,
  MaterialUsage,
  MaterialUsageItem,
  MaterialUsageApproval,
  Asset,
  AssetDepreciationEntry,
  AssetMovementEntry,
  AssetRevaluationEntry,
  Bill,
  BillLineItem,
  BillPayment,
  BillApproval,
  BillItem,
  CommunicationStatus,
  ContractorBill,
  ContractorBillItem,
  ContractorBillPayment,
  ContractorBillApproval,
  ContractorWorkorder,
  ContractorWorkorderItem,
  ContraVoucher,
  ContraVoucherLine,
  ContraVoucherApproval,
  Flat,
  FlatSale,
  FlatSaleInstallment,
  FlatSaleInstallmentPayment,
  Area,
  LeadCategory,
  Workorder,
  WorkorderItem,
  FundRequisition,
  FundRequisitionPayment,
  FundRequisitionApproval,
  JournalVoucher,
  JournalVoucherLine,
  JournalVoucherApproval,
  LabourBill,
  LabourBillItem,
  LabourBillApproval,
  Lead,
  LeadRequirement,
  LeadDealNegotiation,
  LeadFollowUp,
  LeadVisit,
  LeadNote,
  LeadActivityLog,
  ServiceItem,
  Offer,
  ServiceRequisition,
  ServiceRequisitionItem,
  ServiceRequisitionApproval,
  MaterialRequisition,
  MaterialRequisitionItem,
  MaterialRequisitionApproval,
  MaterialRequisitionQuotation,
  MaterialRequisitionQuotationItem,
  Quote,
  QuoteItem,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderBoqItem,
  PurchaseOrderApproval,
  StockTransfer,
  StockTransferItem,
  PeriodBill,
  PaymentVoucher,
  PaymentVoucherApproval,
  ReceiptVoucher,
  ReceiptVoucherApproval,
  Agreement,
  AgreementParty,
  AgreementPayment,
  PartyContact,
  AssignShare,
  BudgetCategory,
  MonthlyBudget,
  OfficeExpense,
  Employee,
  EmployeeAdvance,
  LeaveRequest,
  Attendance,
  PortalRequest,
  Notification,
};