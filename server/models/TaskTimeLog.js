const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskTimeLog = sequelize.define('TaskTimeLog', {
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false },
  endedAt: { type: DataTypes.DATE, allowNull: true }, // null = running
  source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'timer' }, // timer | manual | auto_stopped
  note: { type: DataTypes.STRING(500) },
});

module.exports = TaskTimeLog;