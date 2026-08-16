const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContraVoucherLine = sequelize.define('ContraVoucherLine', {
  account: { type: DataTypes.STRING, allowNull: false },
  debit: { type: DataTypes.FLOAT, defaultValue: 0 },
  credit: { type: DataTypes.FLOAT, defaultValue: 0 },
  chequeReceiptNo: { type: DataTypes.STRING, defaultValue: '' },
  note: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: false });

module.exports = ContraVoucherLine;