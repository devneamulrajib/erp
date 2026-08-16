const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Profession = sequelize.define('Profession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
  },
  addedBy: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'professions',
  timestamps: true,
});

module.exports = Profession;