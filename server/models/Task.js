const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  assignedTo: { type: DataTypes.INTEGER, allowNull: false },
  createdByType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'employee' },
  createdById: { type: DataTypes.INTEGER, allowNull: true },
  createdByName: { type: DataTypes.STRING(120) },
  priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'Medium' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'To Do' },
  dueDate: { type: DataTypes.DATEONLY },
  estimatedMinutes: { type: DataTypes.INTEGER },
  progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  confirmedAt: { type: DataTypes.DATE, allowNull: true },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
  timeSavedSeconds: { type: DataTypes.INTEGER, allowNull: true },
  timeOverrunSeconds: { type: DataTypes.INTEGER, allowNull: true },
});

module.exports = Task;