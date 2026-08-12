const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    name: { type: String, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BillItem', billItemSchema);