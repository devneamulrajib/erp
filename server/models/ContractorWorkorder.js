const mongoose = require('mongoose');

const woItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemName: String,
  description: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  image: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const contractorWorkorderSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,

  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  projectType: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  refInvoiceNo: String,
  contentBody: String,
  attachment: String,

  items: [woItemSchema],

  subtotal: { type: Number, default: 0 },
  vatIncluded: { type: Boolean, default: false },
  vatPercent: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  aitIncluded: { type: Boolean, default: false },
  aitPercent: { type: Number, default: 0 },
  aitAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('ContractorWorkorder', contractorWorkorderSchema);