const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockTransferItem = sequelize.define('StockTransferItem', {
  stockTransferId: DataTypes.INTEGER,
  itemId: DataTypes.INTEGER,
  itemCode: DataTypes.STRING,
  itemName: DataTypes.STRING,
  unit: DataTypes.STRING,
  quantity: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  availableQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  details: DataTypes.STRING,
}, {
  tableName: 'stock_transfer_items',
  timestamps: true,
});

module.exports = StockTransferItem;