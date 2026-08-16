const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Flat = sequelize.define('Flat', {
  code: { type: DataTypes.STRING, unique: true },
  projectId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  flatLandNo: DataTypes.STRING,
  unit: DataTypes.STRING,
  bedroom: { type: DataTypes.INTEGER, defaultValue: 0 },
  bathroom: { type: DataTypes.INTEGER, defaultValue: 0 },
  size: { type: DataTypes.FLOAT, defaultValue: 0 },
  price: { type: DataTypes.FLOAT, defaultValue: 0 },
  parkingCost: { type: DataTypes.FLOAT, defaultValue: 0 },
  utilityCharge: { type: DataTypes.FLOAT, defaultValue: 0 },
  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  customer: DataTypes.STRING,
  status: { type: DataTypes.ENUM('Available', 'Booked', 'Sold'), defaultValue: 'Available' },
  drawing: DataTypes.STRING,
  dining: DataTypes.STRING,
  kitchen: DataTypes.STRING,
  balcony: DataTypes.STRING,
  parking: DataTypes.STRING,
  basement: DataTypes.STRING,
  facing: DataTypes.STRING,
  amenities: DataTypes.STRING,
}, { timestamps: true });

module.exports = Flat;