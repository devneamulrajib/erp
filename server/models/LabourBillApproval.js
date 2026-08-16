const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabourBillApproval = sequelize.define('LabourBillApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = LabourBillApproval;