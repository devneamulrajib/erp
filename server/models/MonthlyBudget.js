const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MonthlyBudget = sequelize.define('MonthlyBudget', {
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  allocatedAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  note: { type: DataTypes.STRING, defaultValue: '' },
  addedBy: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'Approved' }, // 'Pending' | 'Approved' | 'Rejected'
  requestedAmount: { type: DataTypes.FLOAT, allowNull: true },
  requestedBy: { type: DataTypes.STRING, allowNull: true },
  approvedBy: { type: DataTypes.STRING, allowNull: true },
  approvedAt: { type: DataTypes.DATE, allowNull: true },
  rejectedBy: { type: DataTypes.STRING, allowNull: true },
  rejectedAt: { type: DataTypes.DATE, allowNull: true },
  rejectionReason: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['budgetCategoryId', 'year', 'month'] }],
});

module.exports = MonthlyBudget;