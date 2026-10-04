// server/models/PaySlip.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaySlip = sequelize.define('PaySlip', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },

  // Snapshot of the salary structure at the time this slip was generated
  basicSalary: { type: DataTypes.FLOAT, defaultValue: 0 },
  houseRent: { type: DataTypes.FLOAT, defaultValue: 0 },
  medicalAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  grossSalary: { type: DataTypes.FLOAT, defaultValue: 0 },

  advanceDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherAddition: { type: DataTypes.FLOAT, defaultValue: 0 }, // bonus / extra
  totalDeduction: { type: DataTypes.FLOAT, defaultValue: 0 }, // advanceDeduction + otherDeduction
  netSalary: { type: DataTypes.FLOAT, defaultValue: 0 }, // grossSalary - totalDeduction + otherAddition

  // JSON string: [{ advanceId, type, deduct }] — which advances fed advanceDeduction
  advanceBreakdown: { type: DataTypes.TEXT, allowNull: true },

  status: { type: DataTypes.ENUM('Draft', 'Paid'), defaultValue: 'Draft' },
  paidDate: { type: DataTypes.DATEONLY, allowNull: true },
  voucherId: { type: DataTypes.INTEGER, allowNull: true },
  generatedBy: DataTypes.STRING,
}, {
  tableName: 'pay_slips',
  timestamps: true,
  indexes: [{ unique: true, fields: ['employeeId', 'month', 'year'] }],
});

module.exports = PaySlip;