const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Conversation entries. kind = 'reply' (visible to the reporter) or 'note' (internal, staff only).
const SupportTicketMessage = sequelize.define(
  'SupportTicketMessage',
  {
    ticketId: { type: DataTypes.INTEGER, allowNull: false },
    authorId: { type: DataTypes.STRING(64), allowNull: false },
    authorName: { type: DataTypes.STRING(150) },
    authorIsStaff: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    kind: { type: DataTypes.ENUM('reply', 'note'), allowNull: false, defaultValue: 'reply' },
    body: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: 'support_ticket_messages',
    timestamps: true,
    indexes: [{ name: 'idx_stm_ticket', fields: ['ticketId', 'createdAt'] }],
  }
);

module.exports = SupportTicketMessage;