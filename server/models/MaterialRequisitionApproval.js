const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Was an embedded array (`approvals`) on the MaterialRequisition Mongoose doc.
const MaterialRequisitionApproval = sequelize.define('MaterialRequisitionApproval', {
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

module.exports = MaterialRequisitionApproval;