const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    cost: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ServiceItem', serviceItemSchema);