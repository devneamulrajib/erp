const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BudgetCategory = sequelize.define('BudgetCategory', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, defaultValue: '' },
  // Self-referential: null = top-level category (this is what carries a
  // MonthlyBudget allocation). Non-null = subcategory used only to tag
  // expenses more finely; its spending rolls up into the parent's total.
  parentId: { type: DataTypes.INTEGER, allowNull: true },
}, { timestamps: true });

module.exports = BudgetCategory;