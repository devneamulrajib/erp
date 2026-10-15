const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// The investor's own bank details (where we pay them / where their money comes from)
const InvestorBankAccount = sequelize.define('InvestorBankAccount', {
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  bankName: { type: DataTypes.STRING(150), allowNull: false },
  accountName: { type: DataTypes.STRING(150), allowNull: false },
  accountNumber: { type: DataTypes.STRING(80), allowNull: false },
  branch: { type: DataTypes.STRING(150), allowNull: true },
  routingNumber: { type: DataTypes.STRING(50), allowNull: true },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'InvestorBankAccounts', timestamps: true });

module.exports = InvestorBankAccount;