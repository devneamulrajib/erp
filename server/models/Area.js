const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Area', areaSchema);