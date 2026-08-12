const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode: String,
  itemName: String,
  details: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  budgetQty: { type: Number, default: 0 },
  purchaseQty: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
}, { _id: false });

const paymentEntrySchema = new mongoose.Schema({
  transactionId: String,
  method: { type: String, enum: ['Cash', 'Cheque'], default: 'Cash' },
  chequeReceiptNo: String,
  amount: { type: Number, default: 0 },
  date: String,
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  // NOTE: reuses Customer as Supplier — no separate Supplier model exists yet.
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  ledger: { type: String, default: 'Closing Stock' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  reference: String,

  items: [purchaseItemSchema],

  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },

  note: String,
  attachment: String,

  payments: [paymentEntrySchema],
  approvals: [approvalSchema],

  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);