const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  chequeReceiptNo: { type: String, default: '' },
  note: { type: String, default: '' },
}, { _id: false });

const journalVoucherSchema = new mongoose.Schema({
  voucherNo: String,
  date: { type: Date, default: Date.now },
  projectType: String,
  project: String,
  titleOfWork: String,
  site: String,
  task: String,

  lines: [journalLineSchema],

  totalDebit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },

  comment: String,
  attachment: { type: String, default: '' },

  addedBy: String,
  editedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('JournalVoucher', journalVoucherSchema);