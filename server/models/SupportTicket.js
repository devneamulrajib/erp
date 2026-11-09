const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const STATUSES = ['open', 'in_progress', 'pending_customer', 'pending_internal', 'resolved', 'closed', 'reopened'];
const CATEGORIES = ['bug', 'technical_issue', 'access_problem', 'data_issue', 'feature_request', 'general_inquiry'];

// NOTE: `severity` is the ticket PRIORITY (Critical/High/Medium/Low). The column keeps its
// original name so existing rows (e.g. SUP-0001) and the Support modal keep working.
// `type` is the legacy 3-value field; `category` is the new, richer classification.
const SupportTicket = sequelize.define(
  'SupportTicket',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticketNo: { type: DataTypes.STRING(20), unique: true },
    // String, because the built-in superadmin has a non-numeric id ('temp-superadmin')
    reporterId: { type: DataTypes.STRING(64), allowNull: false },
    reporterName: { type: DataTypes.STRING(150), allowNull: true },
    type: { type: DataTypes.ENUM('bug', 'difficulty', 'suggestion'), defaultValue: 'bug' },
    category: { type: DataTypes.ENUM(...CATEGORIES), allowNull: false, defaultValue: 'bug' },
    severity: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'open' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    module: { type: DataTypes.STRING(40), allowNull: true },
    referenceNo: { type: DataTypes.STRING(120), allowNull: true },
    pageUrl: { type: DataTypes.STRING(500) },
    userAgent: { type: DataTypes.STRING(500) },
    screenshot: { type: DataTypes.TEXT('long') }, // legacy base64 screenshot, served through an authorised route
    assignedToId: { type: DataTypes.STRING(64), allowNull: true },
    assignedToName: { type: DataTypes.STRING(150), allowNull: true },
    resolutionNote: { type: DataTypes.TEXT, allowNull: true },
    resolvedById: { type: DataTypes.STRING(64), allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    statusChangedAt: { type: DataTypes.DATE, allowNull: true },
    // --- SLA ---
    firstResponseAt: { type: DataTypes.DATE, allowNull: true },
    firstResponseDueAt: { type: DataTypes.DATE, allowNull: true },
    resolutionDueAt: { type: DataTypes.DATE, allowNull: true },
    slaCustom: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pausedSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    pausedSince: { type: DataTypes.DATE, allowNull: true },
    lastResponseAt: { type: DataTypes.DATE, allowNull: true },
    slaFrAlert: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 }, // 0 none, 1 due soon, 2 breached
    slaResAlert: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    reopenCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // --- soft delete ---
    archivedAt: { type: DataTypes.DATE, allowNull: true },
    archivedById: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: 'support_tickets',
    timestamps: true,
    indexes: [
      { name: 'idx_st_status', fields: ['status'] },
      { name: 'idx_st_severity', fields: ['severity'] },
      { name: 'idx_st_assigned', fields: ['assignedToId'] },
      { name: 'idx_st_reporter', fields: ['reporterId'] },
      { name: 'idx_st_created', fields: ['createdAt'] },
      { name: 'idx_st_category', fields: ['category'] },
    ],
  }
);

module.exports = SupportTicket;
module.exports.STATUSES = STATUSES;
module.exports.CATEGORIES = CATEGORIES;