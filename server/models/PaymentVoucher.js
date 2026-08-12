const mongoose = require('mongoose');

const paymentVoucherSchema = new mongoose.Schema({
  projectType: String,
  project: String,
  titleOfWork: String,
  task: String,
  site: String,

  date: { type: Date, default: Date.now },
  voucherNo: String,

  debitAccount: String,    // payee (Select Accounts)
  creditAccount: String,   // Cash/Bank (Payment Method)
  ifCheque: { type: Boolean, default: false },
  chequeReceiptNo: String,

  amount: Number,
  comment: String,
  attachment: { type: String, default: '' },

  invoiceBill: String,
  item: String,

  addedBy: String,
  editedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PaymentVoucher', paymentVoucherSchema);