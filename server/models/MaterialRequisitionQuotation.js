const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialRequisitionQuotation = sequelize.define('MaterialRequisitionQuotation', {
  materialRequisitionId: { type: DataTypes.INTEGER, allowNull: false },
  supplierId: { type: DataTypes.INTEGER, allowNull: false },
  validUntil: DataTypes.STRING,
  notes: DataTypes.TEXT,
  subtotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('Submitted', 'Accepted', 'Rejected', 'NeedsCorrection'),
    defaultValue: 'Submitted',
  },
  correctionNote: DataTypes.TEXT,
}, { timestamps: true });

module.exports = MaterialRequisitionQuotation;