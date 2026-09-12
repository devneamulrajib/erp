const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChartOfAccount = sequelize.define('ChartOfAccount', {
  chartOfGroupId: { type: DataTypes.INTEGER, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  openingBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  contactType: {
    type: DataTypes.ENUM('Customer', 'Supplier', 'Investor', 'Others'),
    defaultValue: 'Others',
  },
  mobile: DataTypes.STRING,
  email: DataTypes.STRING,
  nid: DataTypes.STRING,
  address: DataTypes.STRING,
  businessName: DataTypes.STRING,
  buyerReference: DataTypes.STRING,
  creditLimit: DataTypes.FLOAT,
  dueDate: DataTypes.DATE,
  image: DataTypes.STRING,

  // --- Portal auth fields ---
  createUser: { type: DataTypes.BOOLEAN, defaultValue: false },
  portalPassword: { type: DataTypes.STRING, allowNull: true },
  portalRole: {
    type: DataTypes.ENUM('customer', 'supplier', 'vendor'),
    allowNull: true,
  },
  resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
  lastPortalLoginAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

module.exports = ChartOfAccount;