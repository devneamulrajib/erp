const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
  conversionUnit: { type: String, default: '' },
  rate: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);