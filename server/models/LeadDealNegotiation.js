const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeadDealNegotiation = sequelize.define('LeadDealNegotiation', {
  flatId: DataTypes.INTEGER,
  activityType: { type: DataTypes.STRING, defaultValue: 'Negotiation' },
  clientOfferPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  listedPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  finalPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  status: { type: DataTypes.ENUM('Pending', 'Accepted', 'Rejected', 'Countered'), defaultValue: 'Pending' },
  round: { type: DataTypes.INTEGER, defaultValue: 1 },
  createdBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = LeadDealNegotiation;