const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Material', 'Product', 'Asset'], required: true },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Category', categorySchema);