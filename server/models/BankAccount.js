const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BankAccount = sequelize.define('BankAccount', {
  name: DataTypes.STRING,
  balance: DataTypes.FLOAT,
  lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false });

module.exports = BankAccount;