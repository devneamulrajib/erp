const mongoose = require('mongoose');

const nomineeSchema = new mongoose.Schema({
  name: String,
  nid: String,
  relation: String,
  percentage: Number,
}, { _id: false });

const customerSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: String,
  nid: { type: String, required: true },
  address: String,
  buyerReference: String,
  creditLimit: { type: Number, default: 0 },
  dueDate: Date,
  openingBalance: { type: Number, default: 0 },
  image: String,
  chartOfGroup: String,
  createUser: { type: Boolean, default: false },
  nominees: [nomineeSchema],
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);