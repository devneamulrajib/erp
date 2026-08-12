const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemName: String,
  description: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  image: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const paymentEntrySchema = new mongoose.Schema({
  transactionId: String,
  method: { type: String, enum: ['Cash', 'Cheque', 'Bank'], default: 'Cash' },
  chequeReceiptNo: String,
  amount: { type: Number, default: 0 },
  date: String,
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  code: { type: String, unique: true }, // e.g. Sale1194151

  date: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  ledger: { type: String, default: 'Flat Sales' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  refWoNo: String, // "Ref W/O No." / PO No.

  content: String, // rich text body from the sale's content editor

  items: [saleItemSchema],

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
  attachment: String,

  payments: [paymentEntrySchema],
  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);