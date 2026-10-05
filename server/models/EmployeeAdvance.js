// server/models/EmployeeAdvance.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EmployeeAdvance = sequelize.define('EmployeeAdvance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Advance Salary', 'Loan'),
    defaultValue: 'Advance Salary',
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  requestDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  repaymentMonths: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // e.g. 1 month for advance salary, 6-12 months for loan
  },
  monthlyDeduction: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  paidAmount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  reason: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Disbursed', 'Rejected', 'Completed'),
    defaultValue: 'Pending',
  },

  // Which payroll month/year this advance's deduction should start applying
  // from — set by the employee when requesting it (defaults to the month
  // after the request if left blank). Nullable so older rows created
  // before this feature keep working as "applies immediately".
  targetMonth: { type: DataTypes.INTEGER, allowNull: true },
  targetYear: { type: DataTypes.INTEGER, allowNull: true },

  disbursementDate: {
    type: DataTypes.DATEONLY,
  },
  officeExpenseId: {
    type: DataTypes.INTEGER,
  },
  approvedBy: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'employee_advances',
  timestamps: true,
});

module.exports = EmployeeAdvance;