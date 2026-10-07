const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceCorrection = sequelize.define('AttendanceCorrection', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  requestedStatus: { type: DataTypes.STRING, defaultValue: 'Present' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
  adminNote: { type: DataTypes.STRING, defaultValue: '' },
  reviewedBy: { type: DataTypes.STRING, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'attendance_corrections',
  timestamps: true,
  indexes: [{ fields: ['employeeId', 'date'] }],
});

module.exports = AttendanceCorrection;