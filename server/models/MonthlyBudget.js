const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MonthlyBudget = sequelize.define('MonthlyBudget', {
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
  allocatedAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  note: { type: DataTypes.STRING, defaultValue: '' },
  addedBy: DataTypes.STRING,
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['budgetCategoryId', 'year', 'month'] },
  ],
});

module.exports = MonthlyBudget;