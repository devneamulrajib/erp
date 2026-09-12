const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Voucher = sequelize.define('Voucher', {
  voucherNo: { type: DataTypes.STRING, unique: true },
  type: {
    type: DataTypes.ENUM('Journal', 'Payment', 'Receipt', 'Contra', 'Expense', 'Purchase', 'Sales'),
    allowNull: false,
  },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

  projectId: DataTypes.INTEGER,
  contactId: DataTypes.INTEGER,

  bankId: DataTypes.INTEGER,
  chequeDate: DataTypes.DATE,
  ifCheque: { type: DataTypes.BOOLEAN, defaultValue: false },
  chequeReceiptNo: DataTypes.STRING,
  reconciliationStatus: {
    type: DataTypes.ENUM('Pending', 'Honour', 'DisHonour'),
    defaultValue: 'Pending',
  },

  narration: DataTypes.TEXT,
  reference: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },

  projectType: DataTypes.STRING,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  site: DataTypes.STRING,
  item: DataTypes.STRING,
  paymentMethod: DataTypes.STRING,
  paymentType: DataTypes.STRING,
  installment: DataTypes.STRING,
  attachment: { type: DataTypes.STRING, defaultValue: '' },

  addedBy: DataTypes.STRING,
  editedBy: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
}, { timestamps: true });

module.exports = Voucher;