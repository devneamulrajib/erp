const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Investor = sequelize.define('Investor', {
  investorCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  nidPassport: DataTypes.STRING,
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  investmentType: {
    type: DataTypes.ENUM('project_based', 'fixed_return', 'hybrid'),
    defaultValue: 'project_based',
  },
  profitSharePercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  fixedReturnPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  notes: DataTypes.TEXT,
  profileImage: DataTypes.STRING,
  chartOfAccountId: DataTypes.INTEGER,
  userId: DataTypes.INTEGER,
}, { timestamps: true });

module.exports = Investor;