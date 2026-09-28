const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Present', 'Absent', 'Leave', 'Holiday'), defaultValue: 'Present' },
  markedBy: DataTypes.STRING,
}, {
  tableName: 'attendances',
  timestamps: true,
});

module.exports = Attendance;