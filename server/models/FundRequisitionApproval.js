const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FundRequisitionApproval = sequelize.define('FundRequisitionApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = FundRequisitionApproval;