const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One line = one method of a payment. A split payment has several lines.
// parentType 'receipt' -> InvestmentReceipts (investor pays us)
// parentType 'payout'  -> InvestorPayments   (we pay the investor)
const InvestorPaymentLine = sequelize.define('InvestorPaymentLine', {
  parentType: { type: DataTypes.ENUM('receipt', 'payout'), allowNull: false },
  parentId: { type: DataTypes.INTEGER, allowNull: false },
  method: { type: DataTypes.ENUM('Cash', 'Bank', 'Cheque'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

  bankAccountId: { type: DataTypes.INTEGER, allowNull: true }, // our bank account
  investorBankAccountId: { type: DataTypes.INTEGER, allowNull: true },

  // Snapshot of the bank details used (kept even if the saved account changes later)
  bankName: { type: DataTypes.STRING(150), allowNull: true },
  accountName: { type: DataTypes.STRING(150), allowNull: true },
  accountNumber: { type: DataTypes.STRING(80), allowNull: true },
  branch: { type: DataTypes.STRING(150), allowNull: true },

  referenceNo: { type: DataTypes.STRING(120), allowNull: true },
  chequeNo: { type: DataTypes.STRING(60), allowNull: true },
  chequeDate: { type: DataTypes.DATEONLY, allowNull: true },

  attachment: { type: DataTypes.STRING(255), allowNull: true }, // stored file name
  attachmentName: { type: DataTypes.STRING(255), allowNull: true }, // original file name

  voucherId: { type: DataTypes.INTEGER, allowNull: true }, // ledger voucher posted for this line
}, { tableName: 'InvestorPaymentLines', timestamps: true });

module.exports = InvestorPaymentLine;