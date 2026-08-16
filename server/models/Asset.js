const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Asset = sequelize.define('Asset', {
  itemId: DataTypes.INTEGER,
  location: { type: DataTypes.STRING, defaultValue: '' },
  originalValue: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  acquisitionDate: { type: DataTypes.DATE, allowNull: false },
  projectId: DataTypes.INTEGER,

  method: {
    type: DataTypes.ENUM('Straight Line', 'Declining Balance', 'Double Declining Balance'),
    defaultValue: 'Straight Line',
  },
  duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  durationUnit: { type: DataTypes.STRING, defaultValue: 'Year' },
  computation: { type: DataTypes.ENUM('Monthly', 'Yearly'), defaultValue: 'Yearly' },

  notDepreciableValue: { type: DataTypes.FLOAT, defaultValue: 0 },
  bookValue: { type: DataTypes.FLOAT, defaultValue: 0 },
  depreciableValue: { type: DataTypes.FLOAT, defaultValue: 0 },

  expenseAccountId: DataTypes.INTEGER,
  voucherNo: { type: DataTypes.STRING, defaultValue: '' },

  status: {
    type: DataTypes.ENUM('Running', 'Disposed', 'Fully Depreciated'),
    defaultValue: 'Running',
  },
}, { timestamps: true });

module.exports = Asset;