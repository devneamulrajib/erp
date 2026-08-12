const mongoose = require('mongoose');

const paymentEntrySchema = new mongoose.Schema({
  transactionId: String,
  method: { type: String, enum: ['Cash', 'Cheque', 'Bank'], default: 'Cash' },
  amount: { type: Number, default: 0 },
  date: String,
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
}, { _id: false });

const fundRequisitionSchema = new mongoose.Schema({
  date: String,

  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  task: String,
  subTask: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },

  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  amount: { type: Number, default: 0 },
  approvedAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },

  purpose: String,
  reference: String,

  paymentStatus: { type: String, enum: ['Payment Left', 'Done'], default: 'Payment Left' },
  payments: [paymentEntrySchema],

  approvals: [approvalSchema],
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('FundRequisition', fundRequisitionSchema);