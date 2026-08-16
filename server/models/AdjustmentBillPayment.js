const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdjustmentBillPayment = sequelize.define('AdjustmentBillPayment', {
  transactionId: DataTypes.STRING,
  paymentMethod: DataTypes.STRING,
  isCheque: { type: DataTypes.BOOLEAN, defaultValue: false },
  chequeReceiptNo: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  date: DataTypes.STRING,
}, { timestamps: false });

module.exports = AdjustmentBillPayment;