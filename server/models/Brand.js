const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);