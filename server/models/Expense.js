const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  project: DataTypes.STRING,
  category: DataTypes.STRING,
  // Links this expense to an office BudgetCategory (Utilities, Stationery,
  // etc.) so it can be tracked against a MonthlyBudget allocation. Nullable
  // and separate from the free-text `category` field above, which is unrelated
  // (that one comes from the general Category model used by Items/Purchases).
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  drAccount: DataTypes.STRING,
  crAccount: DataTypes.STRING,
  amount: DataTypes.FLOAT,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  reference: DataTypes.STRING,
  addedBy: DataTypes.STRING,
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  attachment: { type: DataTypes.STRING, defaultValue: '' },
  voucherId: DataTypes.INTEGER,
}, { timestamps: true });

module.exports = Expense;