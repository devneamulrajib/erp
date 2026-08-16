const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialUsage = sequelize.define('MaterialUsage', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  employee: DataTypes.STRING,

  creditLedger: { type: DataTypes.STRING, defaultValue: 'Closing Stock' },
  debitLedger: { type: DataTypes.STRING, defaultValue: 'Cost of Goods Sold (COGS)' },

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,

  purchaseRef: DataTypes.STRING,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  attachment: DataTypes.STRING,

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = MaterialUsage;