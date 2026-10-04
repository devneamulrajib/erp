// server/migrate-payslip.js
require('dotenv').config();
const sequelize = require('./config/db');
const { DataTypes } = require('sequelize');

async function run() {
  const qi = sequelize.getQueryInterface();
  const tables = (await qi.showAllTables()).map((t) => String(t).toLowerCase());
  const has = (t) => tables.includes(t.toLowerCase());

  if (!has('salary_deductions')) {
    await qi.createTable('salary_deductions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      amount: { type: DataTypes.FLOAT, allowNull: false },
      month: { type: DataTypes.INTEGER, allowNull: false },
      year: { type: DataTypes.INTEGER, allowNull: false },
      note: DataTypes.STRING,
      status: { type: DataTypes.ENUM('Pending', 'Applied'), defaultValue: 'Pending' },
      paySlipId: DataTypes.INTEGER,
      addedBy: DataTypes.STRING,
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    console.log('Created salary_deductions');
  } else {
    console.log('salary_deductions already exists, skipping');
  }

  if (!has('pay_slips')) {
    await qi.createTable('pay_slips', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.INTEGER, allowNull: false },
      month: { type: DataTypes.INTEGER, allowNull: false },
      year: { type: DataTypes.INTEGER, allowNull: false },
      basicSalary: DataTypes.FLOAT,
      houseRent: DataTypes.FLOAT,
      medicalAllowance: DataTypes.FLOAT,
      otherAllowance: DataTypes.FLOAT,
      grossSalary: DataTypes.FLOAT,
      advanceDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
      otherDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
      totalDeduction: { type: DataTypes.FLOAT, defaultValue: 0 },
      netSalary: DataTypes.FLOAT,
      advanceBreakdown: DataTypes.TEXT,
      status: { type: DataTypes.ENUM('Draft', 'Paid'), defaultValue: 'Draft' },
      paidDate: DataTypes.DATEONLY,
      voucherId: DataTypes.INTEGER,
      generatedBy: DataTypes.STRING,
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await qi.addIndex('pay_slips', ['employeeId', 'month', 'year'], {
      unique: true,
      name: 'payslip_employee_month_year',
    });
    console.log('Created pay_slips');
  } else {
    console.log('pay_slips already exists, skipping');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });