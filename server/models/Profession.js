const mongoose = require('mongoose');

const professionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  addedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Profession', professionSchema);