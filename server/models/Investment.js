const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Investment = sequelize.define('Investment', {
  investmentCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: DataTypes.INTEGER,
  principalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  investmentDate: { type: DataTypes.DATEONLY, allowNull: false },
  maturityDate: DataTypes.DATEONLY,
  investmentType: {
    type: DataTypes.ENUM('project_based', 'fixed_return', 'equity'),
    defaultValue: 'project_based',
  },
  profitSharePercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  expectedRoiPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  expectedProfit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  expectedReturn: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('active', 'matured', 'partially_returned', 'fully_returned', 'cancelled'),
    defaultValue: 'active',
  },
  notes: DataTypes.TEXT,
  voucherId: DataTypes.INTEGER,
  debitAccountId: DataTypes.INTEGER,
}, { timestamps: true });

module.exports = Investment;