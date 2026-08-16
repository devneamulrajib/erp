const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabourBill = sequelize.define('LabourBill', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  partyId: DataTypes.INTEGER,
  ledgerId: DataTypes.INTEGER,
  creditLedgerLabel: { type: DataTypes.STRING, defaultValue: 'TBA' },
  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  refWoNo: DataTypes.STRING,
  attachment: DataTypes.STRING,
  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
  vatPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalQuantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalSecurity: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalPayable: { type: DataTypes.FLOAT, defaultValue: 0 },
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'Cash' },
  paid: { type: DataTypes.FLOAT, defaultValue: 0 },
  due: { type: DataTypes.FLOAT, defaultValue: 0 },
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = LabourBill;