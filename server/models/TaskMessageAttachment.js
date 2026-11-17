const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskMessageAttachment = sequelize.define('TaskMessageAttachment', {
  messageId: { type: DataTypes.INTEGER, allowNull: false },
  taskId: { type: DataTypes.INTEGER, allowNull: false },
  fileName: { type: DataTypes.STRING(255), allowNull: false },
  filePath: { type: DataTypes.STRING(500), allowNull: false },
  mimeType: { type: DataTypes.STRING(120), allowNull: true },
  fileSize: { type: DataTypes.INTEGER, allowNull: true },
});

module.exports = TaskMessageAttachment;