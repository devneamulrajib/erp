const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SaleApproval = sequelize.define('SaleApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = SaleApproval;