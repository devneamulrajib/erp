const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  flatLandNo: String,
  unit: String,
  bedroom: { type: Number, default: 0 },
  bathroom: { type: Number, default: 0 },
  size: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  parkingCost: { type: Number, default: 0 },
  utilityCharge: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  customer: String,
  status: { type: String, enum: ['Available', 'Booked', 'Sold'], default: 'Available' },
}, { timestamps: true });

module.exports = mongoose.model('Flat', flatSchema);