const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Was an embedded array (`approvals`) on the ServiceRequisition Mongoose doc.
const ServiceRequisitionApproval = sequelize.define('ServiceRequisitionApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

module.exports = ServiceRequisitionApproval;