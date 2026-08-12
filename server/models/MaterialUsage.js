const mongoose = require('mongoose');

const usageItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode: String,
  itemName: String,
  details: String,
  unit: String,
  useQty: { type: Number, default: 0 },
  budgetQty: { type: Number, default: 0 },
  purchaseQty: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 }, // snapshot of Item.purchasePrice at time of use
  amount: { type: Number, default: 0 },
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const materialUsageSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,
  employee: String,

  creditLedger: { type: String, default: 'Closing Stock' },
  debitLedger: { type: String, default: 'Cost of Goods Sold (COGS)' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

  // Freeform reference to originating Purchase/PO codes, e.g. "PUR452867, PO-007"
  purchaseRef: String,

  items: [usageItemSchema],

  subtotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  attachment: String,

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('MaterialUsage', materialUsageSchema);