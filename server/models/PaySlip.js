// server/models/PaySlip.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaySlip = sequelize.define('PaySlip', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },

  basicSalary: { type: DataTypes.FLOAT, defaultValue: 0 },
  houseRent: { type: DataTypes.FLOAT, defaultValue: 0 },
  medicalAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherAllowance: { type: DataTypes.FLOAT, defaultValue: 0 },
  grossSalary: { type: DataTypes.FLOAT, defaultValue: 0 },

  advanceDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherDeduction: { type: DataTypes.FLOAT, defaultValue: 0 }, // includes one-off + standing deductions
  otherAddition: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
  netSalary: { type: DataTypes.FLOAT, defaultValue: 0 },

  advanceBreakdown: { type: DataTypes.TEXT, allowNull: true },
  // JSON string: [{ standingDeductionId, title, amount, type }] — snapshot
  // of which recurring items (e.g. Food Allowance) were applied this period.
  standingBreakdown: { type: DataTypes.TEXT, allowNull: true },

  status: { type: DataTypes.ENUM('Draft', 'Paid'), defaultValue: 'Draft' },
  paidDate: { type: DataTypes.DATEONLY, allowNull: true },
  voucherId: { type: DataTypes.INTEGER, allowNull: true },

  officeExpenseId: { type: DataTypes.INTEGER, allowNull: true },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: true },

  generatedBy: DataTypes.STRING,
}, {
  tableName: 'pay_slips',
  timestamps: true,
  indexes: [{ unique: true, fields: ['employeeId', 'month', 'year'] }],
});

module.exports = PaySlip;