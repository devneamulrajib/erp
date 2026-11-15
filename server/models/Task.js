const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  assignedTo: { type: DataTypes.INTEGER, allowNull: false }, // Employee.id
  createdByType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'employee' }, // employee | admin
  createdById: { type: DataTypes.INTEGER, allowNull: true }, // null for env superadmin
  createdByName: { type: DataTypes.STRING(120) },
  priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'Medium' }, // Low/Medium/High/Urgent
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'To Do' }, // To Do/In Progress/On Hold/Done/Cancelled
  dueDate: { type: DataTypes.DATEONLY },
  estimatedMinutes: { type: DataTypes.INTEGER },
  progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
});

module.exports = Task;