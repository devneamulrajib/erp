const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode: String,
  itemName: String,
  unit: String,
  quantity: { type: Number, default: 0 },
  availableQty: { type: Number, default: 0 },
  details: String,
}, { _id: false });

const stockTransferSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  date: String,
  employee: String,

  fromProjectType: String,
  fromProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  fromSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  fromTask: String,

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  items: [transferItemSchema],

  toProjectType: String,
  toProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  toSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  toTask: String,
  toSubTask: String,

  // Optional contact tied to the transfer (matches list's CONTACT column)
  contact: String,

  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);