const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockTransfer = sequelize.define('StockTransfer', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  employee: DataTypes.STRING,

  fromProjectType: DataTypes.STRING,
  fromProjectId: DataTypes.INTEGER,
  fromSiteId: DataTypes.INTEGER,
  fromTask: DataTypes.STRING,

  categoryId: DataTypes.INTEGER,

  toProjectType: DataTypes.STRING,
  toProjectId: DataTypes.INTEGER,
  toSiteId: DataTypes.INTEGER,
  toTask: DataTypes.STRING,
  toSubTask: DataTypes.STRING,

  contact: DataTypes.STRING,

  addedBy: DataTypes.STRING,
}, {
  tableName: 'stock_transfers',
  timestamps: true,
});

module.exports = StockTransfer;