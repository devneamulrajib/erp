const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VoucherEntry = sequelize.define('VoucherEntry', {
  accountId: { type: DataTypes.INTEGER, allowNull: false },
  debit: { type: DataTypes.FLOAT, defaultValue: 0 },
  credit: { type: DataTypes.FLOAT, defaultValue: 0 },
  note: DataTypes.STRING,
}, { timestamps: false });

module.exports = VoucherEntry;