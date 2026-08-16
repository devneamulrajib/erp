const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadVisit = sequelize.define('LeadVisit', {
  date: DataTypes.DATE,
  note: DataTypes.TEXT,
  comment: DataTypes.TEXT,
  assignUserId: DataTypes.INTEGER,
  assignUserName: DataTypes.STRING,
  status: DataTypes.STRING,
}, { timestamps: true });

module.exports = LeadVisit;