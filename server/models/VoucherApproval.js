const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VoucherApproval = sequelize.define('VoucherApproval', {
  name: DataTypes.STRING,
  approved: DataTypes.BOOLEAN,
}, { timestamps: false });

module.exports = VoucherApproval;