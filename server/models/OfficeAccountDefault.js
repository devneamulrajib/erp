// server/models/OfficeAccountDefault.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Single-row table: which ledger account is credited for each payment channel.
const OfficeAccountDefault = sequelize.define('OfficeAccountDefault', {
  cashAccount: { type: DataTypes.STRING, allowNull: true },
  bankAccount: { type: DataTypes.STRING, allowNull: true },
  chequeAccount: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'office_account_defaults', timestamps: true });

OfficeAccountDefault.sync().catch((err) => {
  console.error('Failed to sync OfficeAccountDefault table:', err.message);
});

module.exports = OfficeAccountDefault;