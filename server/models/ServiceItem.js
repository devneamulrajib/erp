const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ServiceItem = sequelize.define('ServiceItem', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  categoryId: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  unitId: DataTypes.INTEGER,
  cost: { type: DataTypes.FLOAT, defaultValue: 0 },
  salePrice: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = ServiceItem;