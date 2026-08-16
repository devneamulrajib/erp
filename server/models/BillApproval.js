const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BillApproval = sequelize.define('BillApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = BillApproval;