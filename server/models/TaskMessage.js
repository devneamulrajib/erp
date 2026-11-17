const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskMessage = sequelize.define('TaskMessage', {
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  senderType: { type: DataTypes.STRING(20), allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: true },
  senderName: { type: DataTypes.STRING(120), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = TaskMessage;