const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadRequirement = sequelize.define('LeadRequirement', {
  priceRange: DataTypes.STRING,
  size: DataTypes.STRING,
  areaId: DataTypes.INTEGER,
  type: DataTypes.STRING,
  description: DataTypes.TEXT,
}, { timestamps: true });

module.exports = LeadRequirement;