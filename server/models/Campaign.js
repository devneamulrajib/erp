const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  leadSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource' },
  description: { type: String },
  formId: { type: String }, // Facebook Lead Form ID, if this campaign is Facebook-based
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);