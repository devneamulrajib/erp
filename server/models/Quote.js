const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Quote = sequelize.define('Quote', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  customerId: DataTypes.INTEGER,
  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  attachment: DataTypes.STRING,

  contentBody: DataTypes.TEXT,
  contentFooter: DataTypes.TEXT,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  deliveryCharge: { type: DataTypes.FLOAT, defaultValue: 0 },
  discountPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  discountAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  // New: no status/timeline field existed on Quote before.
  status: { type: DataTypes.STRING, defaultValue: 'Submitted' },

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = Quote;