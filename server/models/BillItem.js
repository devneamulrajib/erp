const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BillItem = sequelize.define('BillItem', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  categoryId: DataTypes.INTEGER,
  brandId: DataTypes.INTEGER,
  name: { type: DataTypes.STRING, allowNull: false },
  unitId: DataTypes.INTEGER,
  purchasePrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  salePrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  description: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: true });

module.exports = BillItem;