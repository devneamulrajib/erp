const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Tracks every create/update/delete on a MonthlyBudget allocation, so admins
// can see who set or changed a budget and why. Keyed by budgetCategoryId +
// year + month (not monthlyBudgetId) so history survives a delete, since a
// deleted MonthlyBudget row's id could later be reused for that same period.
const MonthlyBudgetAuditLog = sequelize.define('MonthlyBudgetAuditLog', {
  monthlyBudgetId: { type: DataTypes.INTEGER, allowNull: true },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.ENUM('Created', 'Updated', 'Deleted'), allowNull: false },
  previousAmount: { type: DataTypes.FLOAT, allowNull: true },
  newAmount: { type: DataTypes.FLOAT, allowNull: true },
  note: { type: DataTypes.STRING, defaultValue: '' },
  performedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = MonthlyBudgetAuditLog;