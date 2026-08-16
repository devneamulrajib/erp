const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChartOfGroup = sequelize.define('ChartOfGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  underId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'chart_of_groups',
  timestamps: true,
});

module.exports = ChartOfGroup;