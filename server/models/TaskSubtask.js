const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskSubtask = sequelize.define('TaskSubtask', {
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(250), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'To Do' },
  isCompleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  completedByType: { type: DataTypes.STRING(20), allowNull: true },
  completedByName: { type: DataTypes.STRING(120), allowNull: true },
  createdByType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'admin' },
  createdById: { type: DataTypes.INTEGER, allowNull: true },
  createdByName: { type: DataTypes.STRING(120), allowNull: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = TaskSubtask;