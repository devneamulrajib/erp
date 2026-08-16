const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContractorBillApproval = sequelize.define('ContractorBillApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = ContractorBillApproval;