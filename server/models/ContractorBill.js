const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContractorBill = sequelize.define('ContractorBill', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  partyId: DataTypes.INTEGER,
  ledgerId: DataTypes.INTEGER,

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
  securityDeposit: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalQuantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  paid: { type: DataTypes.FLOAT, defaultValue: 0 },
  due: { type: DataTypes.FLOAT, defaultValue: 0 },

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = ContractorBill;