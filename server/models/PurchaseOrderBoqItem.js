const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Replaces the old `boqItems: [String]` array — freeform BOQ line labels,
// no dedicated BOQ model exists yet.
const PurchaseOrderBoqItem = sequelize.define('PurchaseOrderBoqItem', {
  purchaseOrderId: DataTypes.INTEGER,
  label: DataTypes.STRING,
}, {
  tableName: 'purchase_order_boq_items',
  timestamps: true,
});

module.exports = PurchaseOrderBoqItem;