const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvestorNote = sequelize.define('InvestorNote', {
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  visibility: { type: DataTypes.ENUM('internal', 'shared'), allowNull: false, defaultValue: 'internal' },
  createdBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = InvestorNote;