const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  project: DataTypes.STRING,
  category: DataTypes.STRING,
  drAccount: DataTypes.STRING,
  crAccount: DataTypes.STRING,
  amount: DataTypes.FLOAT,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  reference: DataTypes.STRING,
  addedBy: DataTypes.STRING,
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  attachment: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: true });

module.exports = Expense;