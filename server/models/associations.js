const AdjustmentBill = require('./AdjustmentBill');
const AdjustmentBillItem = require('./AdjustmentBillItem');
const AdjustmentBillPayment = require('./AdjustmentBillPayment');

const Customer = require('./Customer');
const CustomerNominee = require('./CustomerNominee');

const Expense = require('./Expense');
const ExpenseApproval = require('./ExpenseApproval');

const Voucher = require('./Voucher');
const VoucherEntry = require('./VoucherEntry');
const VoucherApproval = require('./VoucherApproval');

const ChartOfGroup = require('./ChartOfGroup');
const ChartOfAccount = require('./ChartOfAccount');

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

// ---- Batch: ServiceItem, Offer, ServiceRequisition, MaterialRequisition, Quote ----
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

// ---- New for this batch: PurchaseOrder, StockTransfer, PeriodBill,
//      PaymentVoucher, ReceiptVoucher ----
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

Party.hasMany(ContractorWorkorder, { foreignKey: 'supplierId' });
ContractorWorkorder.belongsTo(Party, { foreignKey: 'supplierId' });

Project.hasMany(ContractorWorkorder, { foreignKey: 'projectId' });
ContractorWorkorder.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(ContractorWorkorder, { foreignKey: 'siteId' });
ContractorWorkorder.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(ContractorWorkorder, { foreignKey: 'categoryId' });
ContractorWorkorder.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- ContraVoucher ----
ContraVoucher.hasMany(ContraVoucherLine, { foreignKey: 'contraVoucherId', onDelete: 'CASCADE' });
ContraVoucherLine.belongsTo(ContraVoucher, { foreignKey: 'contraVoucherId' });

ContraVoucher.hasMany(ContraVoucherApproval, { foreignKey: 'contraVoucherId', onDelete: 'CASCADE' });
ContraVoucherApproval.belongsTo(ContraVoucher, { foreignKey: 'contraVoucherId' });

// ---- Flat ----
Project.hasMany(Flat, { foreignKey: 'projectId' });
Flat.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Flat, { foreignKey: 'siteId' });
Flat.belongsTo(Site, { foreignKey: 'siteId' });

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

Customer.hasMany(FlatSale, { foreignKey: 'customerId' });
FlatSale.belongsTo(Customer, { foreignKey: 'customerId' });

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

// ---- Customer ----
Customer.hasMany(CustomerNominee, { foreignKey: 'customerId', onDelete: 'CASCADE' });
CustomerNominee.belongsTo(Customer, { foreignKey: 'customerId' });

// ---- Expense ----
Expense.hasMany(ExpenseApproval, { foreignKey: 'expenseId', onDelete: 'CASCADE' });
ExpenseApproval.belongsTo(Expense, { foreignKey: 'expenseId' });

// ---- Voucher ----
Voucher.hasMany(VoucherEntry, { foreignKey: 'voucherId', onDelete: 'CASCADE' });
VoucherEntry.belongsTo(Voucher, { foreignKey: 'voucherId' });

Voucher.hasMany(VoucherApproval, { foreignKey: 'voucherId', onDelete: 'CASCADE' });
VoucherApproval.belongsTo(Voucher, { foreignKey: 'voucherId' });

// ---- ChartOfGroup (self-referential) ----
ChartOfGroup.belongsTo(ChartOfGroup, { as: 'Under', foreignKey: 'underId' });
ChartOfGroup.hasMany(ChartOfGroup, { as: 'Children', foreignKey: 'underId' });

// ---- ChartOfGroup <-> ChartOfAccount ----
ChartOfGroup.hasMany(ChartOfAccount, { foreignKey: 'chartOfGroupId' });
ChartOfAccount.belongsTo(ChartOfGroup, { foreignKey: 'chartOfGroupId' });

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

Customer.hasMany(Sale, { foreignKey: 'customerId' });
Sale.belongsTo(Customer, { foreignKey: 'customerId' });

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

Customer.hasMany(Purchase, { foreignKey: 'supplierId' });
Purchase.belongsTo(Customer, { foreignKey: 'supplierId' });

Project.hasMany(Purchase, { foreignKey: 'projectId' });
Purchase.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Purchase, { foreignKey: 'siteId' });
Purchase.belongsTo(Site, { foreignKey: 'siteId' });

Category.hasMany(Purchase, { foreignKey: 'categoryId' });
Purchase.belongsTo(Category, { foreignKey: 'categoryId' });

// ---- Asset ----
Asset.hasMany(AssetDepreciationEntry, { foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetDepreciationEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Asset.hasMany(AssetMovementEntry, { foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetMovementEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Asset.hasMany(AssetRevaluationEntry, { foreignKey: 'assetId', onDelete: 'CASCADE' });
AssetRevaluationEntry.belongsTo(Asset, { foreignKey: 'assetId' });

Item.hasMany(Asset, { foreignKey: 'itemId' });
Asset.belongsTo(Item, { foreignKey: 'itemId' });

Project.hasMany(Asset, { foreignKey: 'projectId' });
Asset.belongsTo(Project, { foreignKey: 'projectId' });

ChartOfAccount.hasMany(Asset, { foreignKey: 'expenseAccountId' });
Asset.belongsTo(ChartOfAccount, { foreignKey: 'expenseAccountId' });

// ---- Bill ----
Bill.hasMany(BillLineItem, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillLineItem.belongsTo(Bill, { foreignKey: 'billId' });

Bill.hasMany(BillPayment, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillPayment.belongsTo(Bill, { foreignKey: 'billId' });

Bill.hasMany(BillApproval, { foreignKey: 'billId', onDelete: 'CASCADE' });
BillApproval.belongsTo(Bill, { foreignKey: 'billId' });

Customer.hasMany(Bill, { foreignKey: 'customerId' });
Bill.belongsTo(Customer, { foreignKey: 'customerId' });

ChartOfAccount.hasMany(Bill, { foreignKey: 'ledgerId' });
Bill.belongsTo(ChartOfAccount, { foreignKey: 'ledgerId' });

Project.hasMany(Bill, { foreignKey: 'projectId' });
Bill.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Bill, { foreignKey: 'siteId' });
Bill.belongsTo(Site, { foreignKey: 'siteId' });

// ---- BillItem (catalog) ----
Category.hasMany(BillItem, { foreignKey: 'categoryId' });
BillItem.belongsTo(Category, { foreignKey: 'categoryId' });

Brand.hasMany(BillItem, { foreignKey: 'brandId' });
BillItem.belongsTo(Brand, { foreignKey: 'brandId' });

Unit.hasMany(BillItem, { foreignKey: 'unitId' });
BillItem.belongsTo(Unit, { foreignKey: 'unitId' });

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

// ============================================================
// ---- Workorder ----
// ============================================================
Workorder.hasMany(WorkorderItem, { foreignKey: 'workorderId', onDelete: 'CASCADE' });
WorkorderItem.belongsTo(Workorder, { foreignKey: 'workorderId' });

Customer.hasMany(Workorder, { foreignKey: 'customerId' });
Workorder.belongsTo(Customer, { foreignKey: 'customerId' });

Project.hasMany(Workorder, { foreignKey: 'projectId' });
Workorder.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(Workorder, { foreignKey: 'siteId' });
Workorder.belongsTo(Site, { foreignKey: 'siteId' });

// ---- FundRequisition ----
FundRequisition.hasMany(FundRequisitionPayment, { foreignKey: 'fundRequisitionId', onDelete: 'CASCADE' });
FundRequisitionPayment.belongsTo(FundRequisition, { foreignKey: 'fundRequisitionId' });

FundRequisition.hasMany(FundRequisitionApproval, { foreignKey: 'fundRequisitionId', onDelete: 'CASCADE' });
FundRequisitionApproval.belongsTo(FundRequisition, { foreignKey: 'fundRequisitionId' });

Project.hasMany(FundRequisition, { foreignKey: 'projectId' });
FundRequisition.belongsTo(Project, { foreignKey: 'projectId' });

Site.hasMany(FundRequisition, { foreignKey: 'siteId' });
FundRequisition.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(FundRequisition, { foreignKey: 'fromUserId' });
FundRequisition.belongsTo(User, { foreignKey: 'fromUserId', as: 'From' });

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

Party.hasMany(LabourBill, { foreignKey: 'partyId' });
LabourBill.belongsTo(Party, { foreignKey: 'partyId' });

ChartOfAccount.hasMany(LabourBill, { foreignKey: 'ledgerId' });
LabourBill.belongsTo(ChartOfAccount, { foreignKey: 'ledgerId', as: 'Ledger' });

Project.hasMany(LabourBill, { foreignKey: 'projectId' });
LabourBill.belongsTo(Project, { foreignKey: 'projectId' });

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

// assignedFlats: many-to-many via join table (was an array of Flat refs, not parent-child)
Lead.belongsToMany(Flat, { through: 'LeadAssignedFlats', as: 'assignedFlats', foreignKey: 'leadId' });
Flat.belongsToMany(Lead, { through: 'LeadAssignedFlats', as: 'leads', foreignKey: 'flatId' });

LeadSource.hasMany(Lead, { foreignKey: 'leadSourceId' });
Lead.belongsTo(LeadSource, { foreignKey: 'leadSourceId' });

Project.hasMany(Lead, { foreignKey: 'interestedProjectId' });
Lead.belongsTo(Project, { foreignKey: 'interestedProjectId', as: 'interestedProject' });

LeadCategory.hasMany(Lead, { foreignKey: 'leadCategoryId' });
Lead.belongsTo(LeadCategory, { foreignKey: 'leadCategoryId', as: 'leadCategory' });

Campaign.hasMany(Lead, { foreignKey: 'campaignId' });
Lead.belongsTo(Campaign, { foreignKey: 'campaignId' });

Customer.hasMany(Lead, { foreignKey: 'convertedCustomerId' });
Lead.belongsTo(Customer, { foreignKey: 'convertedCustomerId' });

// ============================================================
// ---- Batch: ServiceItem, Offer, ServiceRequisition,
//      MaterialRequisition, Quote ----
// ============================================================

// ---- ServiceItem ----
Category.hasMany(ServiceItem, { foreignKey: 'categoryId' });
ServiceItem.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Unit.hasMany(ServiceItem, { foreignKey: 'unitId' });
ServiceItem.belongsTo(Unit, { as: 'unit', foreignKey: 'unitId' });

// ---- Offer ---- (standalone, no associations)

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

// ---- MaterialRequisition ----
MaterialRequisition.hasMany(MaterialRequisitionItem, { as: 'items', foreignKey: 'materialRequisitionId', onDelete: 'CASCADE' });
MaterialRequisitionItem.belongsTo(MaterialRequisition, { foreignKey: 'materialRequisitionId' });
Item.hasMany(MaterialRequisitionItem, { foreignKey: 'itemId' });
MaterialRequisitionItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

MaterialRequisition.hasMany(MaterialRequisitionApproval, { as: 'approvals', foreignKey: 'materialRequisitionId', onDelete: 'CASCADE' });
MaterialRequisitionApproval.belongsTo(MaterialRequisition, { foreignKey: 'materialRequisitionId' });

Customer.hasMany(MaterialRequisition, { foreignKey: 'supplierId' });
MaterialRequisition.belongsTo(Customer, { as: 'supplier', foreignKey: 'supplierId' });

Project.hasMany(MaterialRequisition, { foreignKey: 'projectId' });
MaterialRequisition.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(MaterialRequisition, { foreignKey: 'siteId' });
MaterialRequisition.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Category.hasMany(MaterialRequisition, { foreignKey: 'categoryId' });
MaterialRequisition.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

// convertedToPurchaseId / convertedToPurchaseOrderId are FK columns flattened
// from the old `convertedTo` embedded subdoc.
Purchase.hasMany(MaterialRequisition, { foreignKey: 'convertedToPurchaseId' });
MaterialRequisition.belongsTo(Purchase, { as: 'convertedToPurchase', foreignKey: 'convertedToPurchaseId' });

PurchaseOrder.hasMany(MaterialRequisition, { foreignKey: 'convertedToPurchaseOrderId' });
MaterialRequisition.belongsTo(PurchaseOrder, { as: 'convertedToPurchaseOrder', foreignKey: 'convertedToPurchaseOrderId' });

// ---- Quote ----
Quote.hasMany(QuoteItem, { as: 'items', foreignKey: 'quoteId', onDelete: 'CASCADE' });
QuoteItem.belongsTo(Quote, { foreignKey: 'quoteId' });

Customer.hasMany(Quote, { foreignKey: 'customerId' });
Quote.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });

Project.hasMany(Quote, { foreignKey: 'projectId' });
Quote.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(Quote, { foreignKey: 'siteId' });
Quote.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

// ============================================================
// ---- New for this batch: PurchaseOrder, StockTransfer, PeriodBill,
//      PaymentVoucher, ReceiptVoucher ----
// ============================================================

// ---- PurchaseOrder ----
PurchaseOrder.hasMany(PurchaseOrderItem, { as: 'items', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
Item.hasMany(PurchaseOrderItem, { foreignKey: 'itemId' });
PurchaseOrderItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });

PurchaseOrder.hasMany(PurchaseOrderBoqItem, { as: 'boqItems', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderBoqItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });

PurchaseOrder.hasMany(PurchaseOrderApproval, { as: 'approvals', foreignKey: 'purchaseOrderId', onDelete: 'CASCADE' });
PurchaseOrderApproval.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });

Customer.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(Customer, { as: 'supplier', foreignKey: 'supplierId' });

Project.hasMany(PurchaseOrder, { foreignKey: 'projectId' });
PurchaseOrder.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

Site.hasMany(PurchaseOrder, { foreignKey: 'siteId' });
PurchaseOrder.belongsTo(Site, { as: 'site', foreignKey: 'siteId' });

Category.hasMany(PurchaseOrder, { foreignKey: 'categoryId' });
PurchaseOrder.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

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
Customer.hasMany(PeriodBill, { foreignKey: 'customerId' });
PeriodBill.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });

ChartOfAccount.hasMany(PeriodBill, { foreignKey: 'ledgerId' });
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

module.exports = {
  AdjustmentBill,
  AdjustmentBillItem,
  AdjustmentBillPayment,
  Customer,
  CustomerNominee,
  Expense,
  ExpenseApproval,
  Voucher,
  VoucherEntry,
  VoucherApproval,
  ChartOfGroup,
  ChartOfAccount,
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
};