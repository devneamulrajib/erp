const mongoose = require('mongoose');

const communicationStatusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String },
  isDefault: { type: Boolean, default: false },
  leadStage: { type: String }, // e.g. Follow Up, New Call, Query, Negotiation, Hold, Priority
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CommunicationStatus', communicationStatusSchema);