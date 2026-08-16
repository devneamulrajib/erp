const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Unit = sequelize.define('Unit', {
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
  conversionUnit: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
}, {
  tableName: 'units',
  timestamps: true,
});

module.exports = Unit;