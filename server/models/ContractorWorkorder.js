const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContractorWorkorder = sequelize.define('ContractorWorkorder', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  supplierId: DataTypes.INTEGER,
  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  refInvoiceNo: DataTypes.STRING,
  contentBody: DataTypes.TEXT,
  attachment: DataTypes.STRING,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
  vatPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  aitIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
  aitPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  aitAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = ContractorWorkorder;