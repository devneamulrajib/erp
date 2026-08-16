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
}, { timestamps: true });

module.exports = ChartOfAccount;