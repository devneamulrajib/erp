const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Was an embedded array (`items`) on the ServiceRequisition Mongoose doc —
// split into its own table per the "embedded array -> separate model" rule.
const ServiceRequisitionItem = sequelize.define('ServiceRequisitionItem', {
  serviceItemId: DataTypes.INTEGER,
  boqItem: DataTypes.STRING,
  date: DataTypes.STRING,
  code: DataTypes.STRING,
  name: DataTypes.STRING,
  unit: DataTypes.STRING,
  qtyDays: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  details: DataTypes.TEXT,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = ServiceRequisitionItem;