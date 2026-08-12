const mongoose = require('mongoose');

const receiptVoucherSchema = new mongoose.Schema({
  projectType: String,
  project: String,
  titleOfWork: String,
  task: String,
  site: String,

  date: { type: Date, default: Date.now },
  voucherNo: String,

  creditAccount: String,   // contact/party (Select Accounts)
  debitAccount: String,    // Cash/Bank (Payment Method)
  ifCheque: { type: Boolean, default: false },
  chequeReceiptNo: String,

  amount: Number,
  comment: String,
  attachment: { type: String, default: '' },

  invoiceBill: String,
  paymentType: String,
  installment: String,

  addedBy: String,
  editedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('ReceiptVoucher', receiptVoucherSchema);