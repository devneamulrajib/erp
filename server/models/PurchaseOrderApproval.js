const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseOrderApproval = sequelize.define('PurchaseOrderApproval', {
  purchaseOrderId: DataTypes.INTEGER,
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'purchase_order_approvals',
  timestamps: true,
});

module.exports = PurchaseOrderApproval;