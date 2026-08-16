const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FlatSaleInstallment = sequelize.define('FlatSaleInstallment', {
  date: DataTypes.STRING,
  type: { type: DataTypes.STRING, defaultValue: 'Installment' },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  recovered: { type: DataTypes.FLOAT, defaultValue: 0 },
  paid: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = FlatSaleInstallment;