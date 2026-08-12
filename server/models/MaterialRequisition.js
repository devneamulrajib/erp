const mongoose = require('mongoose');

const requisitionItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode: String,
  itemName: String,
  details: String,
  unit: String,
  budgetQty: { type: Number, default: 0 },
  demandQty: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const materialRequisitionSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,
  demandDate: String,

  company: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  reference: String,

  items: [requisitionItemSchema],
  subtotal: { type: Number, default: 0 },

  attachment: String,
  note: String,

  status: { type: String, enum: ['Open', 'PartiallyConverted', 'Converted'], default: 'Open' },
  convertedTo: {
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('MaterialRequisition', materialRequisitionSchema);