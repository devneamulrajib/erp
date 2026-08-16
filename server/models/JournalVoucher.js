const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JournalVoucher = sequelize.define('JournalVoucher', {
  voucherNo: DataTypes.STRING,
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  projectType: DataTypes.STRING,
  project: DataTypes.STRING,
  titleOfWork: DataTypes.STRING,
  site: DataTypes.STRING,
  task: DataTypes.STRING,
  totalDebit: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalCredit: { type: DataTypes.FLOAT, defaultValue: 0 },
  comment: DataTypes.TEXT,
  attachment: { type: DataTypes.STRING, defaultValue: '' },
  addedBy: DataTypes.STRING,
  editedBy: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
}, { timestamps: true });

module.exports = JournalVoucher;