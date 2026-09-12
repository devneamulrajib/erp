const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContraVoucher = sequelize.define('ContraVoucher', {
  voucherNo: DataTypes.STRING,
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  projectType: DataTypes.STRING,
  project: DataTypes.STRING,
  titleOfWork: DataTypes.STRING,
  site: DataTypes.STRING,
  task: DataTypes.STRING,

  totalDebit: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalCredit: { type: DataTypes.FLOAT, defaultValue: 0 },

  // Which bank account this voucher moves money through. Nullable —
  // vouchers with no bank set simply never appear in Bank Reconciliation,
  // since there's nothing to match against a bank statement.
  bankAccount: { type: DataTypes.STRING, allowNull: true },
  chequeDate: { type: DataTypes.DATE, allowNull: true },
  reconciliationStatus: { type: DataTypes.STRING, defaultValue: 'Pending' },

  comment: DataTypes.TEXT,
  attachment: { type: DataTypes.STRING, defaultValue: '' },

  addedBy: DataTypes.STRING,
  editedBy: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, { timestamps: true });

module.exports = ContraVoucher;