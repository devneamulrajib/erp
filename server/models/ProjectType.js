const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectType = sequelize.define('ProjectType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'project_types',
  timestamps: true,
});

module.exports = ProjectType;