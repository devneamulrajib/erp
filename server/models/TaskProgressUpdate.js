const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskProgressUpdate = sequelize.define('TaskProgressUpdate', {
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  percent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  note: { type: DataTypes.TEXT },
});

module.exports = TaskProgressUpdate;