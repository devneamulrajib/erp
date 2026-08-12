const mongoose = require('mongoose');
const expenseSchema = new mongoose.Schema({
  project: String,
  category: String,     // e.g. Materials Carrying
  drAccount: String,     // Dr side
  crAccount: String,     // Cr side
  amount: Number,
  status: { type: String, default: 'pending' }, // pending/approved/rejected
  reference: String,     // e.g. EXP00030
  addedBy: String,
  approvals: [{ name: String, approved: Boolean }],
  date: { type: Date, default: Date.now },
  attachment: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Expense', expenseSchema);