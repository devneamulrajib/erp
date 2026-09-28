const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeaveRequest = sequelize.define('LeaveRequest', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  fromDate: { type: DataTypes.DATEONLY, allowNull: false },
  toDate: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.INTEGER, defaultValue: 1 },
  reason: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
  adminNote: DataTypes.STRING,
  approvedBy: DataTypes.STRING,
}, {
  tableName: 'leave_requests',
  timestamps: true,
});

module.exports = LeaveRequest;