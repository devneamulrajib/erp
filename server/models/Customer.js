const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  nid: { type: DataTypes.STRING, allowNull: false },
  address: DataTypes.STRING,
  buyerReference: DataTypes.STRING,
  creditLimit: { type: DataTypes.FLOAT, defaultValue: 0 },
  dueDate: DataTypes.DATE,
  openingBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  image: DataTypes.STRING,
  chartOfGroupId: DataTypes.INTEGER,
  createUser: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

module.exports = Customer;