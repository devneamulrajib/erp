const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvestorPayment = sequelize.define('InvestorPayment', {
  paymentCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  investmentId: { type: DataTypes.INTEGER, allowNull: false },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  paymentType: {
    type: DataTypes.ENUM('profit_distribution', 'principal_return', 'combined'),
    defaultValue: 'profit_distribution',
  },
  principalPaid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  profitPaid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Bank', 'Cheque'),
    defaultValue: 'Bank',
  },
  bankAccountId: DataTypes.INTEGER,
  creditAccountId: DataTypes.INTEGER,
  referenceNo: DataTypes.STRING,
  status: { type: DataTypes.ENUM('completed', 'pending'), defaultValue: 'completed' },
  notes: DataTypes.TEXT,
  attachment: DataTypes.STRING,
  voucherId: DataTypes.INTEGER,
}, { timestamps: true });

module.exports = InvestorPayment;