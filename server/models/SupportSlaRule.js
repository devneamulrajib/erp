const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Configurable SLA targets per priority, in minutes. Edited by admins from the Support Center.
const SupportSlaRule = sequelize.define(
  'SupportSlaRule',
  {
    priority: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    firstResponseMins: { type: DataTypes.INTEGER, allowNull: false },
    resolutionMins: { type: DataTypes.INTEGER, allowNull: false },
    updatedById: { type: DataTypes.STRING(64) },
    updatedByName: { type: DataTypes.STRING(150) },
  },
  { tableName: 'support_sla_rules', timestamps: true }
);

module.exports = SupportSlaRule;