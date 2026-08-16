const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadSource = sequelize.define('LeadSource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
  },
  addedBy: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'lead_sources',
  timestamps: true,
});

module.exports = LeadSource;