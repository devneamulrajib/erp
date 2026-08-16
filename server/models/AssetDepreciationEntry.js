const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssetDepreciationEntry = sequelize.define('AssetDepreciationEntry', {
  date: { type: DataTypes.DATE, allowNull: false },
  reference: { type: DataTypes.STRING, defaultValue: '' },
  depreciation: { type: DataTypes.FLOAT, defaultValue: 0 },
  cumulativeDepreciation: { type: DataTypes.FLOAT, defaultValue: 0 },
  depreciableValue: { type: DataTypes.FLOAT, defaultValue: 0 },
  journalEntry: { type: DataTypes.STRING, defaultValue: '' },
}, { timestamps: false });

module.exports = AssetDepreciationEntry;