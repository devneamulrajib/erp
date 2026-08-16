const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  projectType: DataTypes.STRING,
  projectManager: DataTypes.STRING,
  description: DataTypes.TEXT,
  budget: DataTypes.FLOAT,
  location: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  area: DataTypes.STRING,
  assignUser: DataTypes.STRING,
  startDate: DataTypes.STRING,
  endDate: DataTypes.STRING,
  totalTask: { type: DataTypes.INTEGER, defaultValue: 0 },
  completeTask: { type: DataTypes.INTEGER, defaultValue: 0 },
  sales: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = Project;