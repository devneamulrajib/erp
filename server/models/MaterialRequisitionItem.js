const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Was an embedded array (`items`) on the MaterialRequisition Mongoose doc.
const MaterialRequisitionItem = sequelize.define('MaterialRequisitionItem', {
  itemId: DataTypes.INTEGER,
  itemCode: DataTypes.STRING,
  itemName: DataTypes.STRING,
  details: DataTypes.TEXT,
  unit: DataTypes.STRING,
  budgetQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  demandQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  stockQty: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = MaterialRequisitionItem;