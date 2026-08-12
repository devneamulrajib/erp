const mongoose = require('mongoose');

const labourItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemName: String,
  description: String,
  unit: String,
  qtyDays: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  security: { type: Number, default: 0 },
  gross: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 },
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const labourBillSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },
  creditLedgerLabel: { type: String, default: 'TBA' },

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  refWoNo: String,

  items: [labourItemSchema],
  attachment: String,

  subtotal: { type: Number, default: 0 },
  vatIncluded: { type: Boolean, default: false },
  vatPercent: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  totalSecurity: { type: Number, default: 0 },
  totalPayable: { type: Number, default: 0 },

  paymentMethod: { type: String, default: 'Cash' },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('LabourBill', labourBillSchema);