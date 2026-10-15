const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Money received FROM the investor against an investment
const InvestmentReceipt = sequelize.define('InvestmentReceipt', {
  receiptCode: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  investmentId: { type: DataTypes.INTEGER, allowNull: false },
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  receiptDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Bank', 'Cheque', 'Multiple'),
    defaultValue: 'Bank',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'InvestmentReceipts', timestamps: true });

module.exports = InvestmentReceipt;