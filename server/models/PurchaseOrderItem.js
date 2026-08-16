const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  purchaseOrderId: DataTypes.INTEGER,
  itemId: DataTypes.INTEGER,
  itemCode: DataTypes.STRING,
  itemName: DataTypes.STRING,
  details: DataTypes.STRING,
  unit: DataTypes.STRING,
  quantity: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  rate: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  budgetQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  purchaseQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  stockQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
}, {
  tableName: 'purchase_order_items',
  timestamps: true,
});

module.exports = PurchaseOrderItem;