const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// NOTE: defaultDrAccount is a column added by migrate-budget-category-accounts.js.
// Run that script before starting the server with this model.
const BudgetCategory = sequelize.define('BudgetCategory', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, defaultValue: '' },
  // Self-referential: null = top-level category (this is what carries a
  // MonthlyBudget allocation). Non-null = subcategory used only to tag
  // expenses more finely; its spending rolls up into the parent's total.
  parentId: { type: DataTypes.INTEGER, allowNull: true },
  // Expense (debit) account that is auto-selected when this category is used.
  defaultDrAccount: { type: DataTypes.STRING, allowNull: true },
}, { timestamps: true });

module.exports = BudgetCategory;