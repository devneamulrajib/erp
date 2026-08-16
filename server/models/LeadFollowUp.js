const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadFollowUp = sequelize.define('LeadFollowUp', {
  followUpDate: DataTypes.DATE,
  note: DataTypes.TEXT,
  comment: DataTypes.TEXT,
  assignUserId: DataTypes.INTEGER,
  assignUserName: DataTypes.STRING,
  status: DataTypes.STRING,
}, { timestamps: true });

module.exports = LeadFollowUp;