const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemName: String,
  description: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  transactionId: String,
  paymentMethod: String,
  isCheque: { type: Boolean, default: false },
  chequeReceiptNo: String,
  amount: { type: Number, default: 0 },
  date: String,
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const contractorBillSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  refWoNo: String,

  items: [billItemSchema],
  attachment: String,

  subtotal: { type: Number, default: 0 },
  vatIncluded: { type: Boolean, default: false },
  vatPercent: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },

  payments: [paymentSchema],
  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('ContractorBill', contractorBillSchema);