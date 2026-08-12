const mongoose = require('mongoose');

const chartOfAccountSchema = new mongoose.Schema({
  chartOfGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfGroup', required: true },
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  openingBalance: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  contactType: {
    type: String,
    enum: ['Customer', 'Supplier', 'Investor', 'Others'],
    default: 'Others',
  },

  // Contact profile fields — used when contactType is Customer/Supplier/Investor
  mobile: { type: String, trim: true },
  email: { type: String, trim: true },
  nid: { type: String, trim: true }, // NID/Birth Certificate/Passport
  address: { type: String, trim: true },
  businessName: { type: String, trim: true },
  buyerReference: { type: String, trim: true },
  creditLimit: { type: Number },
  dueDate: { type: Date },
  image: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ChartOfAccount', chartOfAccountSchema);