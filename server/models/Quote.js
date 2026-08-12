const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
  itemName: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  details: String,
  image: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const quoteSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  attachment: String,

  contentBody: String,
  contentFooter: String,
  items: [quoteItemSchema],

  subtotal: { type: Number, default: 0 },
  vatPercent: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);