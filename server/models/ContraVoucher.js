const mongoose = require('mongoose');

const contraLineSchema = new mongoose.Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  chequeReceiptNo: { type: String, default: '' },
  note: { type: String, default: '' },
}, { _id: false });

const contraVoucherSchema = new mongoose.Schema({
  voucherNo: String,
  date: { type: Date, default: Date.now },
  projectType: String,
  project: String,
  titleOfWork: String,
  site: String,
  task: String,

  lines: [contraLineSchema],

  totalDebit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },

  comment: String,
  attachment: { type: String, default: '' },

  addedBy: String,
  editedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('ContraVoucher', contraVoucherSchema);