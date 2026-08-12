const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: { type: String, required: true },
  phone: String,
  address: String,
  openingBalance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  dueDate: String,
  chartGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfGroup' },
  type: {
    type: String,
    enum: ['contractor', 'supplier', 'labour', 'worker', 'other'],
    default: 'contractor',
  },
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);