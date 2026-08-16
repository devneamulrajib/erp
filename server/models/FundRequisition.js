const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FundRequisition = sequelize.define('FundRequisition', {
  date: DataTypes.STRING,
  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  task: DataTypes.STRING,
  subTask: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  fromUserId: DataTypes.INTEGER,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  approvedAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  paidAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  purpose: DataTypes.STRING,
  reference: DataTypes.STRING,
  paymentStatus: { type: DataTypes.ENUM('Payment Left', 'Done'), defaultValue: 'Payment Left' },
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = FundRequisition;