const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JournalVoucherLine = sequelize.define('JournalVoucherLine', {
  account: { type: DataTypes.STRING, allowNull: false },
  debit: { type: DataTypes.FLOAT, defaultValue: 0 },
  credit: { type: DataTypes.FLOAT, defaultValue: 0 },
  chequeReceiptNo: { type: DataTypes.STRING, defaultValue: '' },
  note: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: false });

module.exports = JournalVoucherLine;