const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  itemName: String,
  description: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  image: String,
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

const billSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  refWoNo: String,

  contentBody: String,
  items: [billItemSchema],

  attachment: String,

  subtotal: { type: Number, default: 0 },
  vatIncluded: { type: Boolean, default: false },
  vatPercent: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  aitIncluded: { type: Boolean, default: false },
  aitPercent: { type: Number, default: 0 },
  aitAmount: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0 },
  interestAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },

  payments: [paymentSchema],
  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);