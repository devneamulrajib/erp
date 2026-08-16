const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JournalVoucherApproval = sequelize.define('JournalVoucherApproval', {
  name: DataTypes.STRING,
  approved: DataTypes.BOOLEAN,
}, { timestamps: false });

module.exports = JournalVoucherApproval;