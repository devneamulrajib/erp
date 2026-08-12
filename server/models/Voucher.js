const mongoose = require('mongoose');

// One line of a double-entry transaction. A voucher can have 2+ entries
// as long as total debits === total credits (enforced in the route, not
// here, since Mongoose pre-save hooks on subdocs are awkward to trust).
const voucherEntrySchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount', required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  note: String,
}, { _id: false });

const voucherSchema = new mongoose.Schema({
  voucherNo: { type: String, unique: true }, // e.g. JV-260812-0001
  type: {
    type: String,
    enum: ['Journal', 'Payment', 'Receipt', 'Contra', 'Expense', 'Purchase', 'Sales'],
    required: true,
  },
  date: { type: Date, default: Date.now },

  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' }, // customer/supplier/investor, optional

  // --- Bank Reconciliation fields ---
  bank: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' }, // cash/bank ledger the cheque is drawn on
  chequeDate: Date,
  reconciliationStatus: {
    type: String,
    enum: ['Pending', 'Honour', 'DisHonour'],
    default: 'Pending',
  },

  entries: {
    type: [voucherEntrySchema],
    validate: {
      validator(entries) {
        if (!entries || entries.length < 2) return false;
        const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
        const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
        return Math.abs(totalDebit - totalCredit) < 0.01; // float-safe equality
      },
      message: 'A voucher needs at least 2 entries, and total debits must equal total credits.',
    },
  },

  narration: String,
  reference: String,
  amount: { type: Number, default: 0 }, // denormalized total (sum of debits) for fast list display

  addedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);