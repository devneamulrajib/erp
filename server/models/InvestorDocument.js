const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvestorDocument = sequelize.define('InvestorDocument', {
  investorId: { type: DataTypes.INTEGER, allowNull: false },
  investmentId: DataTypes.INTEGER,
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'other' },
  fileName: { type: DataTypes.STRING, allowNull: false },
  originalName: { type: DataTypes.STRING, allowNull: false },
  mimeType: DataTypes.STRING(100),
  fileSize: { type: DataTypes.INTEGER, defaultValue: 0 },
  visibleToInvestor: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  uploadedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = InvestorDocument;