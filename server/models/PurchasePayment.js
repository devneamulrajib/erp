const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchasePayment = sequelize.define('PurchasePayment', {
  transactionId: DataTypes.STRING,
  method: { type: DataTypes.ENUM('Cash', 'Cheque'), defaultValue: 'Cash' },
  chequeReceiptNo: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  date: DataTypes.STRING,
}, { timestamps: false });

module.exports = PurchasePayment;