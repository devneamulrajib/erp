const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PeriodBill = sequelize.define('PeriodBill', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  customerId: DataTypes.INTEGER,
  ledgerId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  refWoNo: DataTypes.STRING,

  startDate: DataTypes.STRING,
  endDate: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  projectCost: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  percentage: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  constructionCost: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  serviceCharge: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  grandTotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },

  attachment: DataTypes.STRING,
  contentBody: DataTypes.TEXT,

  addedBy: DataTypes.STRING,
}, {
  tableName: 'period_bills',
  timestamps: true,
});

module.exports = PeriodBill;