const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssetMovementEntry = sequelize.define('AssetMovementEntry', {
  date: { type: DataTypes.DATE, allowNull: false },
  from: { type: DataTypes.STRING, defaultValue: '' },
  to: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: false });

module.exports = AssetMovementEntry;