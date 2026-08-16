const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContraVoucherApproval = sequelize.define('ContraVoucherApproval', {
  name: DataTypes.STRING,
  approved: DataTypes.BOOLEAN,
}, { timestamps: false });

module.exports = ContraVoucherApproval;