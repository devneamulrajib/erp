const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Used ONLY for the "General business request" category. Quote requests,
// material requests, and service requests are NOT stored here — they use
// the existing Quote / MaterialRequisition / ServiceRequisition models
// with a portal-originated flag (see those routes in Phase 2).
const PortalRequest = sequelize.define('PortalRequest', {
  code: { type: DataTypes.STRING, unique: true },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM('Submitted', 'Under Review', 'Approved', 'Rejected', 'Processing', 'Completed'),
    defaultValue: 'Submitted',
  },
  adminNote: { type: DataTypes.TEXT, allowNull: true },
}, { timestamps: true });

module.exports = PortalRequest;