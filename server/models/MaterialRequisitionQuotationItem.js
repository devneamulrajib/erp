const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialRequisitionQuotationItem = sequelize.define('MaterialRequisitionQuotationItem', {
  materialRequisitionQuotationId: { type: DataTypes.INTEGER, allowNull: false },
  materialRequisitionItemId: DataTypes.INTEGER,
  itemName: DataTypes.STRING,
  unit: DataTypes.STRING,
  demandQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },

  // Supplier's response for this specific item
  available: { type: DataTypes.BOOLEAN, defaultValue: true },
  offeredQty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },

  quotedRate: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  quotedAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
}, { timestamps: true });

module.exports = MaterialRequisitionQuotationItem;