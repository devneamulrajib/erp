const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Completely separate from the general Expense model. This is the ONLY
// table that should feed office budget "spent" totals — see
// routes/monthlyBudget.js -> spentFor(). General project Expense rows
// (routes/expense.js) are never counted here.
//
// NOTE: paidTo / billNo / paymentMethod / paymentRef are columns added by
// migrate-office-expense-voucher.js — run that script before starting the
// server with this model, otherwise queries will fail on the missing columns.
const OfficeExpense = sequelize.define('OfficeExpense', {
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, defaultValue: '' },
  drAccount: DataTypes.STRING,
  crAccount: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  reference: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  attachment: { type: DataTypes.STRING, defaultValue: '' },
  voucherId: DataTypes.INTEGER,
  addedBy: DataTypes.STRING,

  // --- Voucher fields (all optional) ---
  paidTo: { type: DataTypes.STRING, defaultValue: '' }, // payee / vendor
  billNo: { type: DataTypes.STRING, defaultValue: '' }, // supplier bill / invoice number
  paymentMethod: { type: DataTypes.STRING, defaultValue: '' }, // Cash | Bank | Cheque
  paymentRef: { type: DataTypes.STRING, defaultValue: '' }, // cheque no. / bank txn ref
}, { timestamps: true });

module.exports = OfficeExpense;