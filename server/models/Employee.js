// server/models/Employee.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  designation: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  joiningDate: { type: DataTypes.DATEONLY },

  // Salary Structure
  basicSalary: { type: DataTypes.FLOAT, defaultValue: 0 },
  houseRent: { type: DataTypes.FLOAT, defaultValue: 0 },
  medicalAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  grossSalary: { type: DataTypes.FLOAT, defaultValue: 0 },

  // Banking Info
  bankName: { type: DataTypes.STRING },
  bankAccountNo: { type: DataTypes.STRING },

  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },

  // Employee Portal login
  portalPassword: { type: DataTypes.STRING },
  portalRole: { type: DataTypes.STRING, defaultValue: 'employee' },
  createUser: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastPortalLoginAt: { type: DataTypes.DATE },
}, {
  tableName: 'employees',
  timestamps: true,
  // Never send the password hash to the browser. Login code uses Employee.unscoped().
  defaultScope: { attributes: { exclude: ['portalPassword'] } },
});

module.exports = Employee;