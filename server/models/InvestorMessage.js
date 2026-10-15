const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvestorMessage = sequelize.define('InvestorMessage', {
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  direction: { type: DataTypes.ENUM('outbound', 'inbound'), allowNull: false, defaultValue: 'outbound' },
  // 'portal' is shown to the investor; every other channel is an internal contact log
  channel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'portal' },
  subject: DataTypes.STRING,
  body: { type: DataTypes.TEXT, allowNull: false },
  sentBy: DataTypes.STRING,
  readAt: DataTypes.DATE,
}, { timestamps: true });

module.exports = InvestorMessage;