const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Audit trail: created, assigned, priority_changed, status_changed, reply_added, note_added,
// attachment_added, edited, link_added, link_removed, archived, restored.
const SupportTicketEvent = sequelize.define(
  'SupportTicketEvent',
  {
    ticketId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(40), allowNull: false },
    actorId: { type: DataTypes.STRING(64) },
    actorName: { type: DataTypes.STRING(150) },
    fromValue: { type: DataTypes.STRING(150) },
    toValue: { type: DataTypes.STRING(150) },
    note: { type: DataTypes.TEXT },
    // Internal events (e.g. a private note) are never returned to the reporter.
    isInternal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'support_ticket_events',
    timestamps: true,
    updatedAt: false,
    indexes: [{ name: 'idx_ste_ticket', fields: ['ticketId', 'createdAt'] }],
  }
);

module.exports = SupportTicketEvent;