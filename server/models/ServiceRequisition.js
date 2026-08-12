const mongoose = require('mongoose');

const requisitionItemSchema = new mongoose.Schema({
  serviceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' },
  boqItem: String,
  date: String,
  code: String,
  name: String,
  unit: String,
  qtyDays: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  details: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const serviceRequisitionSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  titleOfWork: String,
  task: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },

  items: [requisitionItemSchema],
  subtotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  attachment: String,

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequisition', serviceRequisitionSchema);