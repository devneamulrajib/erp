const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FundRequisitionPayment = sequelize.define('FundRequisitionPayment', {
  transactionId: DataTypes.STRING,
  method: { type: DataTypes.ENUM('Cash', 'Cheque', 'Bank'), defaultValue: 'Cash' },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  date: DataTypes.STRING,
  // --- NEW ---
  reference: DataTypes.STRING, // cheque no. / bank txn ref
  note: DataTypes.STRING,
}, { timestamps: false });

module.exports = FundRequisitionPayment;