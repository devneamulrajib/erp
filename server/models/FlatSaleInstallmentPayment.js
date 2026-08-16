const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FlatSaleInstallmentPayment = sequelize.define('FlatSaleInstallmentPayment', {
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  method: { type: DataTypes.ENUM('Cash', 'Cheque'), defaultValue: 'Cash' },
  receiptNo: DataTypes.STRING,
  comment: DataTypes.STRING,
}, { timestamps: false });

module.exports = FlatSaleInstallmentPayment;