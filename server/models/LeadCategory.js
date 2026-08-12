const mongoose = require('mongoose');

const leadCategorySchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LeadCategory', leadCategorySchema);