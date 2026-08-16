const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BoqTitle = sequelize.define('BoqTitle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // NOTE: no FK constraint yet — ProjectType has no Sequelize model/table
  // (projectType.js route currently has no matching model, likely in-memory
  // like Site.js was). Revisit once ProjectType is confirmed/converted.
  projectTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'boq_titles',
  timestamps: true,
});

module.exports = BoqTitle;