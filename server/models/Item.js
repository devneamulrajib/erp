const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Item = sequelize.define('Item', {
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.INTEGER, allowNull: false },
  brandId: DataTypes.INTEGER,
  unit: { type: DataTypes.STRING, allowNull: false },
  purchasePrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  salePrice: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = Item;