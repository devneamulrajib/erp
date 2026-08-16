const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialUsageItem = sequelize.define('MaterialUsageItem', {
  itemId: DataTypes.INTEGER,
  itemCode: DataTypes.STRING,
  itemName: DataTypes.STRING,
  details: DataTypes.TEXT,
  unit: DataTypes.STRING,
  useQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  budgetQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  purchaseQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  stockQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: false });

module.exports = MaterialUsageItem;