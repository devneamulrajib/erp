const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectManager = sequelize.define('ProjectManager', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'project_managers', timestamps: true });

module.exports = ProjectManager;