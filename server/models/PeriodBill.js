const mongoose = require('mongoose');

const periodBillSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  refWoNo: String,

  startDate: String,
  endDate: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectCost: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  constructionCost: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  attachment: String,
  contentBody: String,

  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('PeriodBill', periodBillSchema);