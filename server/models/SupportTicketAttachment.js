const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Metadata only. The file itself lives in server/private-uploads/support-tickets (NOT under
// /uploads, which index.js serves publicly) and is streamed through an authorised route.
const SupportTicketAttachment = sequelize.define(
  'SupportTicketAttachment',
  {
    ticketId: { type: DataTypes.INTEGER, allowNull: false },
    messageId: { type: DataTypes.INTEGER, allowNull: true },
    uploadedById: { type: DataTypes.STRING(64) },
    uploadedByName: { type: DataTypes.STRING(150) },
    originalName: { type: DataTypes.STRING(255), allowNull: false },
    storedName: { type: DataTypes.STRING(120), allowNull: false },
    mimeType: { type: DataTypes.STRING(120) },
    size: { type: DataTypes.INTEGER },
    isInternal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'support_ticket_attachments',
    timestamps: true,
    updatedAt: false,
    indexes: [{ name: 'idx_sta_ticket', fields: ['ticketId'] }],
  }
);

module.exports = SupportTicketAttachment;