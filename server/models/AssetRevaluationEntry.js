const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssetRevaluationEntry = sequelize.define('AssetRevaluationEntry', {
  date: { type: DataTypes.DATE, allowNull: false },
  oldValue: { type: DataTypes.FLOAT, defaultValue: 0 },
  newValue: { type: DataTypes.FLOAT, defaultValue: 0 },
  change: { type: DataTypes.FLOAT, defaultValue: 0 },
  revaluationType: { type: DataTypes.STRING, defaultValue: '' },
  note: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: false });

module.exports = AssetRevaluationEntry;