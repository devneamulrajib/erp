const mongoose = require('mongoose');

const chartOfGroupSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  under: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfGroup', default: null },
  section: { type: String, required: true }, // computed: Assets / Liability / Income / Expense / Owner's Equity
}, { timestamps: true });

module.exports = mongoose.model('ChartOfGroup', chartOfGroupSchema);