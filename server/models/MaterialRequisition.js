const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialRequisition = sequelize.define('MaterialRequisition', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  demandDate: DataTypes.STRING,

  company: DataTypes.STRING,
  supplierId: DataTypes.INTEGER,

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  reference: DataTypes.STRING,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  attachment: DataTypes.STRING,
  note: DataTypes.TEXT,

  status: { type: DataTypes.ENUM('Open', 'PartiallyConverted', 'Converted'), defaultValue: 'Open' },

  // convertedTo was a single embedded subdoc in Mongoose ({ purchase, purchaseOrder })
  // — flattened into two FK columns per the "embedded subdoc -> columns" rule.
  convertedToPurchaseId: DataTypes.INTEGER,
  convertedToPurchaseOrderId: DataTypes.INTEGER,

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = MaterialRequisition;