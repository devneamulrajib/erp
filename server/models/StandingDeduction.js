const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A recurring deduction/addition applied every payroll month (e.g. ৳1000
// Food Allowance deducted from every active employee), as opposed to
// SalaryDeduction which is a one-off item cleared once applied to a slip.
const StandingDeduction = sequelize.define('StandingDeduction', {
  title: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  type: { type: DataTypes.ENUM('Deduction', 'Addition'), defaultValue: 'Deduction' },
  // 'All' = every active employee. 'Employee' = just employeeId.
  appliesTo: { type: DataTypes.ENUM('All', 'Employee'), defaultValue: 'All' },
  employeeId: { type: DataTypes.INTEGER, allowNull: true },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  // Optional window — null start means "from the beginning", null end means "ongoing".
  startMonth: { type: DataTypes.INTEGER, allowNull: true },
  startYear: { type: DataTypes.INTEGER, allowNull: true },
  endMonth: { type: DataTypes.INTEGER, allowNull: true },
  endYear: { type: DataTypes.INTEGER, allowNull: true },
  addedBy: DataTypes.STRING,
}, {
  tableName: 'standing_deductions',
  timestamps: true,
});

module.exports = StandingDeduction;