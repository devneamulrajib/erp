const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabourBillItem = sequelize.define('LabourBillItem', {
  itemId: DataTypes.INTEGER,
  itemName: DataTypes.STRING,
  description: DataTypes.TEXT,
  unit: DataTypes.STRING,
  qtyDays: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  security: { type: DataTypes.FLOAT, defaultValue: 0 },
  gross: { type: DataTypes.FLOAT, defaultValue: 0 },
  netPayable: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: false });

module.exports = LabourBillItem;