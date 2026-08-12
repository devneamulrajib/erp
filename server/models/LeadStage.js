const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String },
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LeadStage', offerSchema);