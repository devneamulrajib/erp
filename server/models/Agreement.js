const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Agreement = sequelize.define('Agreement', {
  date: DataTypes.STRING,
  project: DataTypes.STRING,
  reference: DataTypes.STRING,
  title: DataTypes.STRING,
  termsConditions: DataTypes.TEXT,
  footer: DataTypes.TEXT,
}, {
  tableName: 'agreements',
  timestamps: true,
});

module.exports = Agreement;