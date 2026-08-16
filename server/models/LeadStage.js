const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadStage = sequelize.define('LeadStage', {
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
  description: {
    type: DataTypes.STRING,
  },
  addedBy: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'lead_stages',
  timestamps: true,
});

module.exports = LeadStage;