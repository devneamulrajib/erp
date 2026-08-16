const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadActivityLog = sequelize.define('LeadActivityLog', {
  type: DataTypes.STRING,
  date: DataTypes.DATE,
  status: DataTypes.STRING,
  comment: DataTypes.TEXT,
  addedBy: DataTypes.STRING,
}, { timestamps: false });

module.exports = LeadActivityLog;