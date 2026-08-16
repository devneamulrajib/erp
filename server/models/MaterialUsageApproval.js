const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialUsageApproval = sequelize.define('MaterialUsageApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = MaterialUsageApproval;