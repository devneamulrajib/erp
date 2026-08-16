const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdjustmentBillItem = sequelize.define('AdjustmentBillItem', {
  itemType: { type: DataTypes.ENUM('proposed', 'adjustment'), allowNull: false },
  itemName: DataTypes.STRING,
  description: DataTypes.TEXT,
  unit: DataTypes.STRING,
  quantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  image: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: false });

module.exports = AdjustmentBillItem;