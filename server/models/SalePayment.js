const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SalePayment = sequelize.define('SalePayment', {
  transactionId: DataTypes.STRING,
  method: { type: DataTypes.ENUM('Cash', 'Cheque', 'Bank'), defaultValue: 'Cash' },
  chequeReceiptNo: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  date: DataTypes.STRING,
}, { timestamps: false });

module.exports = SalePayment;