const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BoqTitle = sequelize.define('BoqTitle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'boq_titles',
  timestamps: true,
});

module.exports = BoqTitle;