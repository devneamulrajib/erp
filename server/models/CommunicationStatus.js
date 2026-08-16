const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CommunicationStatus = sequelize.define('CommunicationStatus', {
  name: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
  description: DataTypes.STRING,
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  leadStage: DataTypes.STRING,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = CommunicationStatus;