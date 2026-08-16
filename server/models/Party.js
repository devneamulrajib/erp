const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Party = sequelize.define('Party', {
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  address: DataTypes.STRING,
  openingBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  creditLimit: { type: DataTypes.FLOAT, defaultValue: 0 },
  dueDate: DataTypes.STRING,
  chartGroupId: DataTypes.INTEGER,
  type: {
    type: DataTypes.ENUM('contractor', 'supplier', 'labour', 'worker', 'other'),
    defaultValue: 'contractor',
  },
}, { timestamps: true });

module.exports = Party;