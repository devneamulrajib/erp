const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContractorBillItem = sequelize.define('ContractorBillItem', {
  itemId: DataTypes.INTEGER,
  itemName: DataTypes.STRING,
  description: DataTypes.TEXT,
  unit: DataTypes.STRING,
  quantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: false });

module.exports = ContractorBillItem;