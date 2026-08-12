const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  reference: String,

  // Freeform BOQ line labels shown in the left panel — no dedicated BOQ
  // model exists yet, so this is just a list of strings for now.
  boqItems: [String],
  items: [orderItemSchema],

  subtotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  attachment: String,

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);