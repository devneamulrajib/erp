const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadCategory = sequelize.define('LeadCategory', {
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
  description: {
    type: DataTypes.STRING,
  },
  addedBy: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'lead_categories',
  timestamps: true,
});

module.exports = LeadCategory;