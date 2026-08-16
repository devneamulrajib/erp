const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadNote = sequelize.define('LeadNote', {
  note: DataTypes.TEXT,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = LeadNote;