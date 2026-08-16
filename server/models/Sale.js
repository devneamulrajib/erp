const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sale = sequelize.define('Sale', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  customerId: DataTypes.INTEGER,
  ledger: { type: DataTypes.STRING, defaultValue: 'Flat Sales' },

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  refWoNo: DataTypes.STRING,

  content: DataTypes.TEXT,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
  vatPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  aitIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
  aitPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  aitAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  interestRate: { type: DataTypes.FLOAT, defaultValue: 0 },
  interestAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  paid: { type: DataTypes.FLOAT, defaultValue: 0 },
  due: { type: DataTypes.FLOAT, defaultValue: 0 },
  attachment: DataTypes.STRING,

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = Sale;