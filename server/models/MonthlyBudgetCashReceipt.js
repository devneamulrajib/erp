// server/models/MonthlyBudgetCashReceipt.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MonthlyBudgetCashReceipt = sequelize.define('MonthlyBudgetCashReceipt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false, // 1-12
  },
  budgetCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: true, // null means general office fund for all categories
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  receivedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  receivedFrom: {
    type: DataTypes.STRING,
    defaultValue: 'Management',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'Cash', // Cash, Cheque, Bank Transfer, Mobile Banking
  },
  referenceNo: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  note: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  receivedBy: {
    type: DataTypes.STRING,
    defaultValue: 'Accounts Manager',
  },
}, {
  tableName: 'monthly_budget_cash_receipts',
  timestamps: true,
});

// Auto-sync table if it does not exist yet
MonthlyBudgetCashReceipt.sync().catch((err) => {
  console.error('Failed to sync MonthlyBudgetCashReceipt table:', err.message);
});

module.exports = MonthlyBudgetCashReceipt;