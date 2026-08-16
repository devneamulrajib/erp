const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ServiceRequisition = sequelize.define('ServiceRequisition', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  attachment: DataTypes.STRING,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = ServiceRequisition;