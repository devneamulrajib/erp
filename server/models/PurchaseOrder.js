const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  supplierId: DataTypes.INTEGER,

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  reference: DataTypes.STRING,

  subtotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  grandTotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  attachment: DataTypes.STRING,

  // New: no status/timeline field existed on PurchaseOrder before.
  status: { type: DataTypes.STRING, defaultValue: 'Submitted' },

  addedBy: DataTypes.STRING,
}, {
  tableName: 'purchase_orders',
  timestamps: true,
});

module.exports = PurchaseOrder;