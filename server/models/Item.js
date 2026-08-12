const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  unit: { type: String, required: true },
  purchasePrice: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);