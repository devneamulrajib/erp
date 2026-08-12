const mongoose = require('mongoose');
const bankAccountSchema = new mongoose.Schema({
  name: String,        // Cash, Dutch Bangla Bank, BRAC Bank...
  balance: Number,
  lastUpdated: { type: Date, default: Date.now },
});
module.exports = mongoose.model('BankAccount', bankAccountSchema);