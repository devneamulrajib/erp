const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Completely separate from the general Expense model. This is the ONLY
// table that should feed office budget "spent" totals — see
// routes/monthlyBudget.js -> spentFor(). General project Expense rows
// (routes/expense.js) are never counted here.
const OfficeExpense = sequelize.define('OfficeExpense', {
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, defaultValue: '' },
  drAccount: DataTypes.STRING,
  crAccount: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  reference: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  attachment: { type: DataTypes.STRING, defaultValue: '' },
  voucherId: DataTypes.INTEGER,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = OfficeExpense;