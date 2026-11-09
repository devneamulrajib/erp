const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per related pair; read it from either side.
const SupportTicketLink = sequelize.define(
  'SupportTicketLink',
  {
    ticketId: { type: DataTypes.INTEGER, allowNull: false },
    relatedTicketId: { type: DataTypes.INTEGER, allowNull: false },
    createdById: { type: DataTypes.STRING(64) },
    createdByName: { type: DataTypes.STRING(150) },
  },
  {
    tableName: 'support_ticket_links',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { name: 'uq_stl_pair', unique: true, fields: ['ticketId', 'relatedTicketId'] },
      { name: 'idx_stl_related', fields: ['relatedTicketId'] },
    ],
  }
);

module.exports = SupportTicketLink;