const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Purchase = sequelize.define('Purchase', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  supplierId: DataTypes.INTEGER, // reuses Customer table as Supplier
  ledger: { type: DataTypes.STRING, defaultValue: 'Closing Stock' },

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  reference: DataTypes.STRING,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  deliveryCharge: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  paid: { type: DataTypes.FLOAT, defaultValue: 0 },
  due: { type: DataTypes.FLOAT, defaultValue: 0 },

  note: DataTypes.TEXT,
  attachment: DataTypes.STRING,

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = Purchase;