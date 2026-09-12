const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignShare = sequelize.define('AssignShare', {
  projectId: DataTypes.INTEGER,
  projectTypeId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  flatId: DataTypes.INTEGER,
  customerId: DataTypes.INTEGER,
  shareCode: DataTypes.STRING,
  noOfShare: { type: DataTypes.INTEGER, defaultValue: 0 },
  shareAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 }, // manual for now
  paidAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },  // manual for now
  note: DataTypes.TEXT,
}, {
  tableName: 'assign_shares',
  timestamps: true,
});

module.exports = AssignShare;