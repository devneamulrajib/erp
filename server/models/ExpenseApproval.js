const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExpenseApproval = sequelize.define('ExpenseApproval', {
  name: DataTypes.STRING,
  approved: DataTypes.BOOLEAN,
}, { timestamps: false });

module.exports = ExpenseApproval;