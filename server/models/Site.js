const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Site = sequelize.define('Site', {
  code: { type: DataTypes.STRING, unique: true },
  projectTypeName: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  projectName: DataTypes.STRING,
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  location: DataTypes.STRING,
  sales: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = Site;