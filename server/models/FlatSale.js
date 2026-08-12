const mongoose = require('mongoose');

const paymentEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, default: 0 },
  method: { type: String, enum: ['Cash', 'Cheque'], default: 'Cash' },
  receiptNo: String,
  comment: String,
}, { _id: false });

const installmentSchema = new mongoose.Schema({
  date: String,
  type: { type: String, default: 'Installment' },
  amount: { type: Number, default: 0 },
  recovered: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  payments: [paymentEntrySchema],
});
// Note: installments now keep their default auto-generated _id (removed
// `_id: false`) so the Installment Report can pay against one specifically.

const flatSaleSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: { type: String },
  bookingNo: String,

  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  projectType: String,
  collectionOfficer: String,
  salesBy: String,
  ledger: { type: String, default: 'Flat Sales' },
  attachment: String,

  // Snapshot of the flat's size at time of sale, used for subtotal calc
  size: { type: Number, default: 0 },

  rate: { type: Number, default: 0 },
  parking: { type: Number, default: 0 },
  utilityCharge: { type: Number, default: 0 },
  otherCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  bookingMoney: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'Cheque'], default: 'Cash' },
  chequeReceiptNo: String,

  installments: [installmentSchema],

  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },

  status: { type: String, enum: ['Booked', 'Sold'], default: 'Booked' },
}, { timestamps: true });

module.exports = mongoose.model('FlatSale', flatSaleSchema);