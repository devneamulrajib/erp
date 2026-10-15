const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SupportTicket = sequelize.define(
  'SupportTicket',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticketNo: { type: DataTypes.STRING(20), unique: true },
    // String, because the built-in superadmin has a non-numeric id ('temp-superadmin')
    reporterId: { type: DataTypes.STRING(64), allowNull: false },
    reporterName: { type: DataTypes.STRING(150), allowNull: true },
    type: {
      type: DataTypes.ENUM('bug', 'difficulty', 'suggestion'),
      defaultValue: 'bug',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'open',
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    pageUrl: { type: DataTypes.STRING(500) },
    userAgent: { type: DataTypes.STRING(500) },
    screenshot: { type: DataTypes.TEXT('long') },
    assignedToId: { type: DataTypes.STRING(64), allowNull: true },
    resolutionNote: { type: DataTypes.TEXT, allowNull: true },
    resolvedById: { type: DataTypes.STRING(64), allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'support_tickets', timestamps: true }
);

module.exports = SupportTicket;