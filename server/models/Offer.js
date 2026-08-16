const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Offer = sequelize.define('Offer', {
  name: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
  description: DataTypes.TEXT,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = Offer;