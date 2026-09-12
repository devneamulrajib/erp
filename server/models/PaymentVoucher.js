const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaymentVoucher = sequelize.define('PaymentVoucher', {
  projectType: DataTypes.STRING,
  project: DataTypes.STRING,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  site: DataTypes.STRING,

  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  voucherNo: DataTypes.STRING,

  debitAccount: DataTypes.STRING,
  creditAccount: DataTypes.STRING,
  ifCheque: { type: DataTypes.BOOLEAN, defaultValue: false },
  chequeReceiptNo: DataTypes.STRING,

  // Which bank account this voucher moves money through. Nullable —
  // vouchers with no bank set simply never appear in Bank Reconciliation,
  // since there's nothing to match against a bank statement.
  bankAccount: { type: DataTypes.STRING, allowNull: true },
  chequeDate: { type: DataTypes.DATE, allowNull: true },
  reconciliationStatus: { type: DataTypes.STRING, defaultValue: 'Pending' },

  amount: DataTypes.DECIMAL(14, 2),
  comment: DataTypes.TEXT,
  attachment: { type: DataTypes.STRING, defaultValue: '' },

  invoiceBill: DataTypes.STRING,
  item: DataTypes.STRING,

  addedBy: DataTypes.STRING,
  editedBy: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, {
  tableName: 'payment_vouchers',
  timestamps: true,
});

module.exports = PaymentVoucher;