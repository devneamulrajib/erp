const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Single unified timeline for everything that happens around the Office
// Budget module — expenses, budget allocations, category changes, and
// salary payments (which deduct from budget via OfficeExpense). Other
// per-feature logs (e.g. MonthlyBudgetAuditLog) still exist and keep
// working as before; this table is additive, for the Office Report feed.
const ActivityLog = sequelize.define('ActivityLog', {
  // 'Expense' | 'Budget' | 'Category' | 'Salary'
  module: { type: DataTypes.STRING, allowNull: false },
  // Free-form per-module action, e.g. 'Created', 'Updated', 'Deleted', 'Paid', 'Unpaid'
  action: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: true },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  relatedType: DataTypes.STRING,
  relatedId: DataTypes.INTEGER,
  performedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = ActivityLog;