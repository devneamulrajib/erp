const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseApproval = sequelize.define('PurchaseApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = PurchaseApproval;