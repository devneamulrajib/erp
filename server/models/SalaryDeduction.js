// server/models/SalaryDeduction.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SalaryDeduction = sequelize.define('SalaryDeduction', {
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false }, // e.g. "Meal Bill - September" or "Eid Bonus"
  amount: { type: DataTypes.FLOAT, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12, payroll month it applies to
  year: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.STRING, defaultValue: '' },
  // Deduction = reduces net salary (meal bill, fine, etc.)
  // Addition  = increases net salary (bonus, allowance, incentive, etc.)
  type: { type: DataTypes.ENUM('Deduction', 'Addition'), allowNull: false, defaultValue: 'Deduction' },
  // Pending = not yet paid out; Applied = already included on a Paid payslip
  status: { type: DataTypes.ENUM('Pending', 'Applied'), defaultValue: 'Pending' },
  paySlipId: { type: DataTypes.INTEGER, allowNull: true },
  addedBy: DataTypes.STRING,
}, {
  tableName: 'salary_deductions',
  timestamps: true,
});

module.exports = SalaryDeduction;